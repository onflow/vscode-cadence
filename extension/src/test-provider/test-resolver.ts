import * as vscode from 'vscode';
import * as CadenceParser from "@onflow/cadence-parser";
import * as path from 'path';
import { CADENCE_TEST_TAG } from './constants';
import { StateCache } from '../utils/state-cache';
import { QueuedMutator, TestTrie } from './test-trie';
import { encodeTestId } from './utils';

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
  #fileWatcher: vscode.FileSystemWatcher | null = null;
  #testTrie: QueuedMutator<TestTrie>;
  
  constructor(parserBinaryOrLocation: string | Buffer, controller: vscode.TestController, testTrie: QueuedMutator<TestTrie>) {
    this.#controller = controller;
    this.#parser = CadenceParser.CadenceParser.create(parserBinaryOrLocation)
    this.testTree = new StateCache<void>(() => Promise.resolve());
    this.#testTrie = testTrie;

    void this.watchFiles();
    this.loadAllTests();
  }

  async watchFiles(): Promise<void> {
    const isDirectory = async (uri: vscode.Uri) => (await (vscode.workspace.fs.stat(uri) as Promise<vscode.FileStat>).catch(() => null))?.type === vscode.FileType.Directory;

    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.loadAllTests();
    });

    this.#fileWatcher = vscode.workspace.createFileSystemWatcher('**')

    this.#fileWatcher.onDidCreate(async (uri) => {
      this.#testTrie.mutate(async (trie) => {
        if (await isDirectory(uri)) {
          const files = await vscode.workspace.findFiles(new vscode.RelativePattern(uri.fsPath, '**/*.cdc'));
          await Promise.all(files.map(async (file) => {
            await this.addTestsFromFile(file.fsPath, trie);
          }));
        } else if (uri.fsPath.endsWith('.cdc')) {
          await this.addTestsFromFile(uri.fsPath, trie);
        }
      })
    });
    this.#fileWatcher.onDidDelete((uri: vscode.Uri) => {
      this.#testTrie.mutate(async (trie) => {
          trie.remove(uri.fsPath);
      })
    });
    this.#fileWatcher.onDidChange((uri: vscode.Uri) => {
      void this.#testTrie.mutate(async (trie) => {
        if(!(await isDirectory(uri))) {
          trie.remove(uri.fsPath);
          await this.addTestsFromFile(uri.fsPath, trie);
        }
      })
    });
  }

  loadAllTests(): void {
    const trieItemsPromise = (async () => {
      const parser = await this.#parser;

      // Build test tree
      const testFilepaths = (await vscode.workspace.findFiles(`**/*.cdc`)).map((uri) => uri.fsPath);
      let items: [string, vscode.TestItem[]][] = [];

      for (const filepath of testFilepaths) {
        const uri = vscode.Uri.file(filepath);
        const fileContents = await vscode.workspace.fs.readFile(uri);
        const ast = await parser.parse(fileContents.toString());
        const tests = this.findTestsFromAst(uri, ast);
        if (tests.length > 0) {
          items.push([filepath, tests]);
        }
      }

      return items;
    })

    this.#testTrie.mutate(async (trie) => {
      const items = await trieItemsPromise();

      // Clear test tree
      trie.clear();
      for (const [filepath, tests] of items) {
        trie.add(filepath, tests);
      }
    });
  }

  async addTestsFromFile(filepath: string, trie: TestTrie): Promise<void> {
    const uri = vscode.Uri.file(filepath);
    const parser = await this.#parser;
    const fileContents = await vscode.workspace.fs.readFile(uri);
    const ast = await parser.parse(fileContents.toString());
    const tests = this.findTestsFromAst(uri, ast);
    if(tests.length > 0) {
      trie.remove(filepath);
      trie.add(filepath, tests);
    }
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
      const testItem = this.#controller!.createTestItem(encodeTestId(uri.fsPath, testId), testId, uri);

      testItem.range = new vscode.Range(declaration.StartPos.Line - 1, declaration.StartPos.Column, declaration.EndPos.Line, declaration.EndPos.Column);
      testItem.tags = [CADENCE_TEST_TAG];
      return testItem;
    } catch {
      return null;
    }
  }
}