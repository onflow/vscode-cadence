import * as vscode from 'vscode';
import { CADENCE_TEST_TAG } from './constants';
import { execDefault } from '../utils/shell/exec';
import * as path from 'path';
import { Settings } from '../settings/settings';
import { FlowConfig } from '../server/flow-config';
import { QueuedMutator, TestTrie } from './test-trie';
import { TestResolver } from './test-resolver';
import { decodeTestFunctionId } from './utils';

const TEST_RESULT_PASS = "PASS";

type TestResult = {
    [filename: string]: {
        [testName: string]: string
    }
}

function semaphore (concurrency: number) {
    let current = 0;
    const queue: (() => void)[] = [];
    return async <T>(fn: () => Promise<T>): Promise<T> => {
        return new Promise((resolve, reject) => {
            const run = async () => {
                current++;
                try {
                    resolve(await fn());
                } catch (error) {
                    reject(error);
                } finally {
                    current--;
                    if (queue.length > 0) {
                        queue.shift()!();
                    }
                }
            };
            if (current >= concurrency) {
                queue.push(run);
            } else {
                run();
            }
        });
    };
}

export class TestRunner implements vscode.Disposable {
    #controller: vscode.TestController;
    #testTrie: QueuedMutator<TestTrie>;
    #settings: Settings;
    #flowConfig: FlowConfig
    #testResolver: TestResolver
    #acquireLock: <T>(fn: () => Promise<T>) => Promise<T>;
    #disposibles: vscode.Disposable[] = [];

    constructor(controller: vscode.TestController, testTrie: QueuedMutator<TestTrie>, settings: Settings, flowConfig: FlowConfig, testResolver: TestResolver) {
        this.#controller = controller;
        this.#testTrie = testTrie;
        this.#settings = settings;
        this.#flowConfig = flowConfig;
        this.#testResolver = testResolver;
        this.#acquireLock = semaphore(settings.maxTestConcurrency);

        this.#disposibles.push(this.#controller.createRunProfile('Cadence Tests', vscode.TestRunProfileKind.Run, this.runTests.bind(this), true, CADENCE_TEST_TAG))
    }

    dispose(): void {
        this.#disposibles.forEach((disposable) => disposable.dispose());
    }

    async runTests (request: vscode.TestRunRequest, cancellationToken?: vscode.CancellationToken, hookTestRun: (testRun: vscode.TestRun) => vscode.TestRun = run => run): Promise<void> {
        // Flush the test trie to make sure that all tests are up to date
        await this.#testTrie.getState();

        // Allow the test run creation to be hooked into for testing purposes
        const run = hookTestRun(this.#controller.createTestRun(request));

        await Promise.all(request.include?.map(async (test) => {
            await this.runTestItem(test, run, cancellationToken);
        }) ?? [])

        run.end();
    }

    private async runTestItem (test: vscode.TestItem, run: vscode.TestRun, cancellationToken?: vscode.CancellationToken): Promise<void> {
        if (cancellationToken?.isCancellationRequested) {
            return;
        }

        const testFunctionName = decodeTestFunctionId(test.id);

        if (testFunctionName != null) {    
            await this.runIndividualTest(test, run, cancellationToken);
        } else {
            const fsStat = await vscode.workspace.fs.stat(test.uri!);
            if (fsStat.type === vscode.FileType.Directory) {
                await this.runTestFolder(test, run, cancellationToken);
            } else {
                await this.runTestFile(test, run, cancellationToken);
            }
        }
    }

    async runTestFolder (test: vscode.TestItem, run: vscode.TestRun, cancellationToken?: vscode.CancellationToken): Promise<void> {
        const promises: Promise<void>[] = [];
        test.children.forEach((child) => {
            promises.push(this.runTestItem(child, run, cancellationToken))
        });
        await Promise.all(promises);
    }

    async runTestFile (test: vscode.TestItem, run: vscode.TestRun, cancellationToken?: vscode.CancellationToken): Promise<void> {
        // Notify that all tests contained within the uri have started
        test.children.forEach((testItem) => {
            run.started(testItem);
        })

        // If files are dirty they must be saved before running tests
        // The trie is updated with the new test items after the file is saved
        let resolvedTest: vscode.TestItem | null = test;
        const openDocument = vscode.workspace.textDocuments.find((document) => document.uri.fsPath === test.uri!.fsPath);
        if(openDocument != null && openDocument.isDirty) {
            await openDocument.save();
            await this.#testTrie.mutate(async (trie) => {
                await this.#testResolver.addTestsFromFile(test.uri!.fsPath, trie)
            })

            const trie = await this.#testTrie.getState();
            resolvedTest = trie.get(test.uri!.fsPath)

            if (resolvedTest == null) {
                throw new Error(`Failed to find test item for ${test.uri!.fsPath} in test trie`)
            }

            // Make sure that new test items are notified as started
            resolvedTest.children.forEach((testItem) => {
                run.started(testItem);
            })
        }

        // Execute the tests
        const testFilePath = path.resolve(this.#flowConfig.configPath!, resolvedTest.uri!.fsPath)
        let testResults: TestResult = {};
        try {
            testResults = await this.executeTests(testFilePath, null, run, cancellationToken);
        } catch (error: any) {
            resolvedTest.children.forEach((testItem) => {
                run.errored(testItem, new vscode.TestMessage(error.message + "\n" + error.stack));
            })
            return;
        }

        // Notify the results of all tests contained within the uri
        resolvedTest.children.forEach((testItem) => {
            const testId = decodeTestFunctionId(testItem.id);
            const result = (testId && testResults[testFilePath]?.[testId]) ?? "ERROR - Test not found"

            if (result === TEST_RESULT_PASS) {
                run.passed(testItem);
            } else {
                run.failed(testItem, {
                    message: result,
                });
            }
        })
    }

    async runIndividualTest (test: vscode.TestItem, run: vscode.TestRun, cancellationToken?: vscode.CancellationToken): Promise<void> {
        // Run parent test item to run the individual test
        // In the future we may want to run the individual test directly
        await this.runTestItem(test.parent!, run, cancellationToken);
    }

    private async executeTests (globPattern: string, testName: string | null, run: vscode.TestRun, cancellationToken?: vscode.CancellationToken): Promise<TestResult> {
        if (cancellationToken?.isCancellationRequested) {
            return {};
        }
        return await this.#acquireLock(async () => {
            const args = ["test", `'${globPattern}'`, "--output=json", "-f", `${this.#flowConfig.configPath!}`];
            const {stdout, stderr} = await execDefault(this.#settings.flowCommand, args, {shell: true, cwd: path.dirname(this.#flowConfig.configPath!)}, cancellationToken);

            if (stderr.length > 0) {
                throw new Error(stderr);
            }

            const testResults = JSON.parse(stdout) as TestResult;
            return testResults;
        })
    }
}