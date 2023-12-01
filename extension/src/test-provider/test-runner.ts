import * as vscode from 'vscode';
import { CADENCE_TEST_TAG } from './constants';
import { execDefault } from '../utils/shell/exec';
import path = require('path');
import { Settings } from '../settings/settings';
import { FlowConfig } from '../server/flow-config';
import { StateCache } from '../utils/state-cache';
import { firstValueFrom, skip } from 'rxjs';

const TEST_RESULT_PASS = "PASS";

type TestResult = {
    [filename: string]: {
        [testName: string]: string
    }
}

export class TestRunner {
    #controller: vscode.TestController;
    #testTree: StateCache<void>;
    #settings: Settings;
    #flowConfig: FlowConfig

    constructor(controller: vscode.TestController, testTree: StateCache<void>, settings: Settings, flowConfig: FlowConfig) {
        this.#controller = controller;
        this.#testTree = testTree;
        this.#settings = settings;
        this.#flowConfig = flowConfig;
        this.#controller.createRunProfile('All Tests', vscode.TestRunProfileKind.Run, this.runTests.bind(this), true, CADENCE_TEST_TAG);
    }

    async runTests (request: vscode.TestRunRequest, cancellationToken: vscode.CancellationToken): Promise<void> {
        const run = this.#controller!.createTestRun(request);
        await Promise.all(request.include?.map(async (test) => {
            await this.runTestItem(test, run, cancellationToken);
        }) ?? [])

        run.end();
    }

    private async runTestItem (test: vscode.TestItem, run: vscode.TestRun, cancellationToken: vscode.CancellationToken): Promise<void> {
        if (cancellationToken.isCancellationRequested) {
            return;
        }

        const fsStat = test.uri ? await vscode.workspace.fs.stat(test.uri) : null
        switch (fsStat?.type) {
            case vscode.FileType.Directory:
                await this.runTestFolder(test, run, cancellationToken);
                break;
            case vscode.FileType.File:
                await this.runTestFile(test, run, cancellationToken);
                break;
            default:
                await this.runIndividualTest(test, run, cancellationToken);
                break;
        }
    }

    async runTestFolder (test: vscode.TestItem, run: vscode.TestRun, cancellationToken: vscode.CancellationToken): Promise<void> {
        const promises: Promise<void>[] = [];
        test.children.forEach((child) => {
            promises.push(this.runTestItem(child, run, cancellationToken))
        });
        await Promise.all(promises);
    }

    async runTestFile (test: vscode.TestItem, run: vscode.TestRun, cancellationToken: vscode.CancellationToken): Promise<void> {
        // Notify that all tests contained within the uri have started
        test.children.forEach((testItem) => {
            run.started(testItem);
        })

        // Save the file if it is dirty & wait for the test tree to update
        if(vscode.window.activeTextEditor?.document.uri.toString() === test.uri?.toString() && vscode.window.activeTextEditor?.document.isDirty) {
            await vscode.window.activeTextEditor?.document.save();
            await firstValueFrom(this.#testTree)
            test.children.forEach((testItem) => {
                run.started(testItem);
            })
        }

        // Execute the tests
        const testFilePath = path.resolve(this.#flowConfig.configPath!, test.uri!.fsPath)
        const rawTestResults = await this.executeTests(testFilePath, null, run, cancellationToken);

        // Flatten and the test results to a map of testId -> testResult
        const individualTestResults: { [testId: string]: string | undefined } = Object.entries(rawTestResults).reduce((acc, [filename, tests]) => {
            Object.entries(tests).forEach(([testName, result]) => {
                const resolvedPath = path.resolve(this.#flowConfig.configPath!, filename);
                const testId = `${vscode.Uri.file(resolvedPath).toString()}/${testName}`;
                acc[testId] = result;
            });
            return acc;
        }, {} as { [testId: string]: string | undefined });

        // Notify the results of all tests contained within the uri
        test.children.forEach((testItem) => {
            const testId = testItem.id;
            const result = individualTestResults[testId] ?? "ERROR - Test not found"

            if (result === TEST_RESULT_PASS) {
                run.passed(testItem);
            } else {
                run.failed(testItem, {
                    message: result
                });
            }
        })
    }

    async runIndividualTest (test: vscode.TestItem, run: vscode.TestRun, cancellationToken: vscode.CancellationToken): Promise<void> {
        throw new Error('Not implemented');
    }

    private async executeTests (globPattern: string, testName: string | null, run: vscode.TestRun, cancellationToken: vscode.CancellationToken): Promise<TestResult> {
        if (cancellationToken.isCancellationRequested) {
            return {};
        }
        const args = ["test", `'${globPattern}'`, "--output=json", "-f", `${this.#flowConfig.configPath!}`];
        const {stdout} = await execDefault(this.#settings.flowCommand, args, {shell: true}, cancellationToken);
        const testResults = JSON.parse(stdout) as TestResult;
        return testResults;
    }
}