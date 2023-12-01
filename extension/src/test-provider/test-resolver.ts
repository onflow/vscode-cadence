import * as vscode from 'vscode';
import * as CadenceParser from "@onflow/cadence-parser";
import * as path from 'path';
import { CADENCE_TEST_TAG } from './constants';
import { Subject, debounceTime } from 'rxjs';
import { StateCache } from '../utils/state-cache';

interface Ast {
  program: {
    Declarations: Declaration[]
  }
}

interface Declaration {
  Type: string
  Identifier: {
    Identifier: string
  }
  StartPos: {
    Line: number
    Column: number
  }
  EndPos: {
    Line: number
    Column: number
  }
}

export class TestResolver {
  testTree: StateCache<void>;
  #controller: vscode.TestController
  #parser: Promise<CadenceParser.CadenceParser>
  #parserBinaryOrLocation: string | Buffer;
  #fileWatcher: vscode.FileSystemWatcher | null = null;
  
  constructor(parserBinaryOrLocation: string | Buffer, controller: vscode.TestController) {
    this.#controller = controller;
    this.#parserBinaryOrLocation = parserBinaryOrLocation;
    this.#parser = CadenceParser.CadenceParser.create(this.#parserBinaryOrLocation)
    this.testTree = new StateCache<void>(this.findTests.bind(this));

    this.watchFiles();
  }

  async watchFiles(): Promise<void> {
    vscode.workspace.workspaceFolders?.forEach((folder) => {
      this.#fileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, '**/*.cdc'));
      this.#fileWatcher.onDidChange(() => this.testTree.invalidate());
      this.#fileWatcher.onDidCreate(() => this.testTree.invalidate());
      this.#fileWatcher.onDidDelete(() => this.testTree.invalidate());
    })
  }

  async findTests(): Promise<void> {
    const parser = await this.#parser;

    // Build test tree
    const workspaceFolders = vscode.workspace.workspaceFolders ?? []
    const files = await vscode.workspace.findFiles(`**/*.cdc`);
    const workspaceFolderTestFiles: {[folder: string]: vscode.Uri[]} = {};

    for (const file of files) {
      for (const folder of workspaceFolders) {
        if (file.fsPath.startsWith(folder.uri.fsPath)) {
          if (workspaceFolderTestFiles[folder.uri.toString()] == null) {
            workspaceFolderTestFiles[folder.uri.toString()] = [];
          }
          workspaceFolderTestFiles[folder.uri.toString()].push(file);
        }
      }
    }

    // Used to mark all tests that should be in the test tree & not pruned out
    const liveTests = new Set<string>();

    for (const folderPath of Object.keys(workspaceFolderTestFiles)) {
      const folder = workspaceFolders.find((folder) => folder.uri.toString() === folderPath);
      if (folder == null) continue;

      // Create a node for the workspace folder if it doesn't exist
      let workspaceFolderTestItem = this.#controller.items.get(folder.uri.toString())
      if(workspaceFolderTestItem == null) {
        workspaceFolderTestItem = this.#controller.createTestItem(folder.uri.toString(), folder.name, folder.uri);
      }
      workspaceFolderTestItem.canResolveChildren = true;
      workspaceFolderTestItem.tags = [CADENCE_TEST_TAG];

      for (const file of files) {
        const uri = vscode.Uri.file(file.fsPath)
        const buffer = await vscode.workspace.fs.readFile(uri);
        const text = buffer.toString();
        const ast = await parser.parse(text);
        const testFunctions = this.findTestsFromAst(uri, ast);
        if (testFunctions.length === 0) {
          continue;
        }

        let currNode = workspaceFolderTestItem;

        // Iterate through each segment of the path and create a node for it
        const relativePath = path.relative(folder.uri.fsPath, file.fsPath)
        relativePath.split(path.sep).forEach((segment) => {
          const segmentUri = vscode.Uri.file(path.join(currNode.uri!.fsPath, segment));
          let segmentTestItem = currNode.children.get(segmentUri.fsPath);
          if (segmentTestItem == null) {
            segmentTestItem = this.#controller.createTestItem(segmentUri.fsPath, segment, segmentUri);
          }

          segmentTestItem.tags = [CADENCE_TEST_TAG];
          segmentTestItem.canResolveChildren = true;

          currNode.children.add(segmentTestItem);
          liveTests.add(segmentTestItem.id);
          currNode = segmentTestItem;
        })

        // Leaf node is the file
        const fileTestItem = currNode;
        fileTestItem.canResolveChildren = false

        // Add all test functions for the file to the leaf node
        testFunctions.forEach((testFunction) => {
          fileTestItem.children.add(testFunction);
          liveTests.add(testFunction.id);
        })
      }

      if (workspaceFolderTestItem.children.size > 0) {
        this.#controller.items.add(workspaceFolderTestItem);
        liveTests.add(workspaceFolderTestItem.id);
      }
    }

    // Prune out any tests that are no longer in the test tree
    const pruneTests = (items: vscode.TestItemCollection) => {
      items.forEach((child) => {
        if (!liveTests.has(child.id)) {
          items.delete(child.id);
        } else {
          pruneTests(child.children);
        }
      })
    }
    pruneTests(this.#controller.items)
  }

  findTestsFromAst(uri: vscode.Uri, ast: Ast): vscode.TestItem[] {
    try {
      const {program} = ast;
      const {Declarations} = program;
      const tests = Declarations.filter((declaration: any) => {
        return declaration.Type === 'FunctionDeclaration' && declaration.Identifier.Identifier.startsWith('test');
      });

      const astTests: vscode.TestItem[] = [];
      tests.forEach((test: any) => {
        const testItem = this.declarationToTestItem(uri, test);
        if (testItem != null) {
          astTests.push(testItem);
        }
      })

      return astTests;
    } catch(e) {
      return [];
    }
  }

  private declarationToTestItem(uri: vscode.Uri, declaration: Declaration): vscode.TestItem | null {
    try {
      const {Identifier} = declaration;
      const testId = Identifier.Identifier;
      const testItem = this.#controller!.createTestItem(`${uri.toString()}/${testId}`, testId, uri);

      testItem.range = new vscode.Range(declaration.StartPos.Line - 1, declaration.StartPos.Column, declaration.EndPos.Line, declaration.EndPos.Column);
      testItem.tags = [CADENCE_TEST_TAG];
      return testItem;
    } catch {
      return null;
    }
  }
}