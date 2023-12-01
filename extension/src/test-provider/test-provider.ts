import * as vscode from 'vscode';
import { TestResolver } from './test-resolver';
import { TestRunner } from './test-runner';
import { Settings } from '../settings/settings';
import { FlowConfig } from '../server/flow-config';
import { StateCache } from '../utils/state-cache';

const testControllerId = 'cadence-test-controller';
const testControllerLabel = 'Cadence Tests';
const CADENCE_TEST_COMMAND = 'flow test'

export class TestProvider {
  #controller: vscode.TestController;
  #testResolver: TestResolver
  #testRunner: TestRunner
  #testTree: StateCache<void>;

  constructor(parserBinaryOrLocation: string | Buffer, settings: Settings, flowConfig: FlowConfig) {
    this.#controller = vscode.tests.createTestController(testControllerId, testControllerLabel);
    this.#testResolver = new TestResolver(parserBinaryOrLocation, this.#controller);
    this.#testTree = this.#testResolver.testTree;

    this.#testRunner = new TestRunner(this.#controller, this.#testTree, settings, flowConfig);
  }

  async activate() {
  }
}