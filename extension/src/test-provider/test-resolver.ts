import * as vscode from 'vscode';
import * as CadenceParser from "@onflow/cadence-parser";
import * as path from 'path';
import { CADENCE_TEST_TAG } from './constants';

export class TestResolver {
  #controller: vscode.TestController
  #parser: CadenceParser.CadenceParser | null = null;
  #parserBinaryOrLocation: string | Buffer;

  constructor(parserBinaryOrLocation: string | Buffer, controller: vscode.TestController) {
    this.#controller = controller;
    this.#parserBinaryOrLocation = parserBinaryOrLocation;
  }

  async activate(): Promise<void> {
    this.#parser = await CadenceParser.CadenceParser.create(this.#parserBinaryOrLocation)
    this.findTests();
  }

  async findTests(): Promise<void> {
    if (this.#parser == null) {
      return;
    }

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

    for (const folderPath of Object.keys(workspaceFolderTestFiles)) {
      const folder = workspaceFolders.find((folder) => folder.uri.toString() === folderPath);
      if (folder == null) continue;
      const workspaceFolderTestItem = this.#controller.createTestItem(folder.uri.toString(), folder.name, folder.uri);
      workspaceFolderTestItem.canResolveChildren = true;
      workspaceFolderTestItem.tags = [CADENCE_TEST_TAG];

      for (const file of files) {
        const uri = vscode.Uri.file(file.fsPath)
        const buffer = await vscode.workspace.fs.readFile(uri);
        const text = buffer.toString();
        const ast = await this.#parser.parse(text);
        const testItem = this.tryParseAst(uri, ast);
        if (testItem == null) continue;

        const relativePath = path.relative(folder.uri.fsPath, file.fsPath)
        let currNode = workspaceFolderTestItem;
        relativePath.split(path.sep).forEach((segment) => {
          const segmentUri = vscode.Uri.file(path.join(currNode.uri!.fsPath, segment));
          let segmentTestItem = currNode.children.get(segmentUri.fsPath);
          if (segmentTestItem == null) {
            segmentTestItem = this.#controller.createTestItem(segmentUri.fsPath, segment, segmentUri);
          }

          segmentTestItem.tags = [CADENCE_TEST_TAG];
          segmentTestItem.canResolveChildren = true;

          currNode.children.add(segmentTestItem);
          currNode = segmentTestItem;
        })

        // Leaf node is individual test
        const leafTestItem = currNode;
        leafTestItem.canResolveChildren = false

        // Add all individual tests in this file to the node
        testItem.forEach((test) => {
          leafTestItem.children.add(test);
        })
      }

      if (workspaceFolderTestItem.children.size > 0) {
        this.#controller.items.add(workspaceFolderTestItem);
      }
    }
  }

  tryParseAst(uri: vscode.Uri, ast: any): vscode.TestItem[] {
    try {
      const {program} = ast;
      const {Declarations} = program;
      const tests = Declarations.filter((declaration: any) => {
        return declaration.Type === 'FunctionDeclaration' && declaration.Identifier.Identifier.startsWith('test');
      });
      if (tests.length === 0) {
        return [];
      }

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

  private declarationToTestItem(uri: vscode.Uri, declaration: any): vscode.TestItem | null {
    try {
      const {Identifier} = declaration;
      const testId = Identifier.Identifier;
      const testItem = this.#controller!.createTestItem(`${uri.toString()}/${testId}`, testId, uri);
      testItem.range = new vscode.Range(declaration.StartPos.Line, declaration.StartPos.Column, declaration.EndPos.Line, declaration.EndPos.Column);
      testItem.tags = [CADENCE_TEST_TAG];
      return testItem;
    } catch {
      return null;
    }
  }
}