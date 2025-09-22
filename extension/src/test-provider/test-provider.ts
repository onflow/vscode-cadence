import * as vscode from 'vscode'
import { TestResolver } from './test-resolver'
import { TestRunner } from './test-runner'
import { Settings } from '../settings/settings'
import { QueuedMutator, TestTrie } from './test-trie'

const testControllerId = 'cadence-test-controller'
const testControllerLabel = 'Cadence Tests'

export class TestProvider implements vscode.Disposable {
  #controller: vscode.TestController
  #testResolver: TestResolver
  #testRunner: TestRunner
  #testTrie: QueuedMutator<TestTrie>

  constructor (parserLocation: string, settings: Settings) {
    this.#controller = vscode.tests.createTestController(testControllerId, testControllerLabel)
    this.#testTrie = new QueuedMutator(new TestTrie(this.#controller), recoverTrieError.bind(this))
    this.#testResolver = new TestResolver(parserLocation, this.#controller, this.#testTrie)
    this.#testRunner = new TestRunner(this.#controller, this.#testTrie, settings, this.#testResolver)

    // Recover from trie errors by rebuilding the test tree from scratch
    // It shouldn't happen, but if it does, this should catch tricky bugs
    // And leave the user with a seemingly normal experience
    function recoverTrieError (this: TestProvider, _: Error, abortMutations: () => void): void {
      abortMutations()
      void this.#testResolver.loadAllTests()
    }
  }

  dispose (): void {
    this.#controller.dispose()
    this.#testResolver.dispose()
    this.#testRunner.dispose()
  }

  async runAllTests (cancellationToken?: vscode.CancellationToken, hookTestRun?: (testRun: vscode.TestRun) => vscode.TestRun): Promise<void> {
    const trie = await this.#testTrie.getState()

    const request = new vscode.TestRunRequest(trie.rootNodes)
    return await this.#testRunner.runTests(request, cancellationToken, hookTestRun)
  }

  async runIndividualTest (testPath: string, cancellationToken?: vscode.CancellationToken, hookTestRun?: (testRun: vscode.TestRun) => vscode.TestRun): Promise<void> {
    const test = (await this.#testTrie.getState()).get(testPath)
    if (test == null) {
      return
    }

    const request = new vscode.TestRunRequest([test])
    return await this.#testRunner.runTests(request, cancellationToken, hookTestRun)
  }
}
