import * as vscode from 'vscode';
import * as CadenceParser from "@onflow/cadence-parser";
import { StateCache } from '../utils/state-cache';
import { QueuedMutator, TestFunction, TestTrie } from './test-trie';
import { encodeTestFunctionId } from './utils';

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

export class TestResolver implements vscode.Disposable {
  testTree: StateCache<void>;
  #controller: vscode.TestController
  #parser: Thenable<CadenceParser.CadenceParser>
  #testTrie: QueuedMutator<TestTrie>;
  #disposables: vscode.Disposable[] = [];
  
  constructor(parserLocation: string, controller: vscode.TestController, testTrie: QueuedMutator<TestTrie>) {
    this.#controller = controller;
    this.#parser = vscode.workspace.fs.readFile(vscode.Uri.file(parserLocation)).then(buffer => CadenceParser.CadenceParser.create(buffer))
    this.testTree = new StateCache<void>(() => Promise.resolve());
    this.#testTrie = testTrie;

    void this.watchFiles();
    this.loadAllTests();
    this.#controller.refreshHandler = async () => {
      await this.loadAllTests();
    }
  }

  dispose(): void {
    this.#disposables.forEach((disposable) => disposable.dispose());
  }

  async watchFiles(): Promise<void> {
    const isDirectory = async (uri: vscode.Uri) => (await (vscode.workspace.fs.stat(uri) as Promise<vscode.FileStat>).catch(() => null))?.type === vscode.FileType.Directory;

    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.loadAllTests();
    });

    const watcher = vscode.workspace.createFileSystemWatcher('**')

    watcher.onDidCreate(async (uri) => {
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
    watcher.onDidDelete((uri: vscode.Uri) => {
      this.#testTrie.mutate(async (trie) => {
          trie.remove(uri.fsPath);
      })
    });
    watcher.onDidChange((uri: vscode.Uri) => {
      void this.#testTrie.mutate(async (trie) => {
        if(!(await isDirectory(uri))) {
          trie.remove(uri.fsPath);
          await this.addTestsFromFile(uri.fsPath, trie);
        }
      })
    });

    this.#disposables.push(watcher);
  }

  async loadAllTests(): Promise<void> {
    const trieItemsPromise = (async () => {
      // Build test tree
      const testFilepaths = (await vscode.workspace.findFiles(`**/*.cdc`)).map((uri) => uri.fsPath);
      let items: [string, TestFunction[]][] = [];

      await Promise.all(testFilepaths.map(async (filepath) => {
        const tests = await this.#findTestsFromPath(filepath);
        if (tests.length > 0) {
          items.push([filepath, tests]);
        }
      }));

      return items;
    })()

    await this.#testTrie.mutate(async (trie) => {
      const items = await trieItemsPromise;

      // Clear test tree
      trie.clear();
      for (const [filepath, tests] of items) {
        trie.add(filepath, tests);
      }
    });
  }

  async addTestsFromFile(filepath: string, trie: TestTrie): Promise<void> {
    const tests = await this.#findTestsFromPath(filepath);
    if(tests.length > 0) {
      trie.remove(filepath);
      trie.add(filepath, tests);
    }
  }

  async #findTestsFromPath(filepath: string): Promise<TestFunction[]> {
    try {
      const parser = await this.#parser;
      const uri = vscode.Uri.file(filepath);
      const fileContents = await vscode.workspace.fs.readFile(uri);
      const ast: Ast = await parser.parse(fileContents.toString());
      const {program} = ast;
      const {Declarations} = program;
      const tests = Declarations.filter((declaration: any) => {
        return declaration.Type === 'FunctionDeclaration' && declaration.Identifier.Identifier.startsWith('test');
      });

      const astTests: TestFunction[] = [];
      tests.forEach((test: any) => {
        const testFunction = this.#declarationToTestFunction(uri, test);
        if (testFunction != null) {
          astTests.push(testFunction);
        }
      })

      return astTests;
    } catch(e) {
      return [];
    }
  }

  #declarationToTestFunction(uri: vscode.Uri, declaration: Declaration): TestFunction | null {
    try {
      const {Identifier} = declaration;
      const testId = Identifier.Identifier;

      return {
        name: testId,
        range: new vscode.Range(declaration.StartPos.Line - 1, declaration.StartPos.Column, declaration.EndPos.Line, declaration.EndPos.Column),
      };
    } catch {
      return null;
    }
  }
}