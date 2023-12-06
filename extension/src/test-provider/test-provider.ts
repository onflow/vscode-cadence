import * as vscode from 'vscode';
import { TestResolver } from './test-resolver';
import { TestRunner } from './test-runner';
import { Settings } from '../settings/settings';
import { FlowConfig } from '../server/flow-config';
import { QueuedMutator, TestTrie } from './test-trie';

const testControllerId = 'cadence-test-controller';
const testControllerLabel = 'Cadence Tests';

export class TestProvider implements vscode.Disposable {
  #controller: vscode.TestController;
  #testResolver: TestResolver;
  #testRunner: TestRunner;
  #testTrie: QueuedMutator<TestTrie>;

  constructor(parserLocation: string, settings: Settings, flowConfig: FlowConfig) {
    this.#controller = vscode.tests.createTestController(testControllerId, testControllerLabel);
    this.#testTrie = new QueuedMutator(new TestTrie(this.#controller), recoverTrieError.bind(this));
    this.#testResolver = new TestResolver(parserLocation, this.#controller, this.#testTrie)
    this.#testRunner = new TestRunner(this.#controller, this.#testTrie, settings, flowConfig, this.#testResolver);

    // Recover from trie errors by rebuilding the test tree
    function recoverTrieError(this: TestProvider, error: Error) {
      this.#testTrie.cancelMutations();
      this.#testResolver.loadAllTests();
    }
  }

  dispose(): void {
    this.#controller.dispose();
    this.#testResolver.dispose();
    this.#testRunner.dispose();
  }

  async runAllTests(cancellationToken?: vscode.CancellationToken, hookTestRun?: (testRun: vscode.TestRun) => vscode.TestRun): Promise<void> {
    await this.#testTrie.flush();

    const request = new vscode.TestRunRequest(this.#testTrie.state.rootNodes)
    return this.#testRunner.runTests(request, cancellationToken, hookTestRun);
  }

  async runIndividualTest(testPath: string, cancellationToken?: vscode.CancellationToken, hookTestRun?: (testRun: vscode.TestRun) => vscode.TestRun): Promise<void> {
    await this.#testTrie.flush();

    const test = this.#testTrie.state.get(testPath)
    if (test == null) {
      return;
    }

    const request = new vscode.TestRunRequest([test])
    return this.#testRunner.runTests(request, cancellationToken, hookTestRun);
  }
}