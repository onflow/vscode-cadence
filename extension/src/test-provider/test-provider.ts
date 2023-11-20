import * as vscode from 'vscode';
import { TestResolver } from './test-resolver';
import { TestRunner } from './test-runner';
import { Settings } from '../settings/settings';
import { FlowConfig } from '../server/flow-config';

const testControllerId = 'cadence-test-controller';
const testControllerLabel = 'Cadence Tests';
const CADENCE_TEST_COMMAND = 'flow test'

export class TestProvider {
  #controller: vscode.TestController;
  #testResolver: TestResolver
  #testRunner: TestRunner

  constructor(parserBinaryOrLocation: string | Buffer, settings: Settings, flowConfig: FlowConfig) {
    this.#controller = vscode.tests.createTestController(testControllerId, testControllerLabel);
    this.#testResolver = new TestResolver(parserBinaryOrLocation, this.#controller);
    this.#testRunner = new TestRunner(this.#controller, settings, flowConfig);
  }

  async activate() {
    await this.#testResolver.activate();
  }
}