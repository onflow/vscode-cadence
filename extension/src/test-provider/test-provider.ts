import * as vscode from 'vscode';
import { TestResolver } from './test-resolver';
import { TestRunner } from './test-runner';
import { Settings } from '../settings/settings';
import { FlowConfig } from '../server/flow-config';
import { QueuedMutator, TestTrie } from './test-trie';

const testControllerId = 'cadence-test-controller';
const testControllerLabel = 'Cadence Tests';

export class TestProvider {
  constructor(parserBinaryOrLocation: string | Buffer, settings: Settings, flowConfig: FlowConfig) {
    const controller = vscode.tests.createTestController(testControllerId, testControllerLabel);
    const testTrie = new QueuedMutator(new TestTrie(controller), recoverTrieError);
    const testResolver = new TestResolver(parserBinaryOrLocation, controller, testTrie)
    const testRunner = new TestRunner(controller, testTrie, settings, flowConfig, testResolver);

    // Recover from trie errors by rebuilding the test tree
    function recoverTrieError() {
      testTrie.cancelMutations();
      testResolver.loadAllTests();
    }
  }

  async activate() {
  }
}