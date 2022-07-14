import * as assert from 'assert'
import * as cmd from '../../src/commands/command-constants'
import * as vscode from 'vscode'
import { EmulatorState } from '../../src/emulator/emulator-controller'
import { ext } from '../../src/main'
import { delay } from './index'

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.')
    .then(() => {}, () => {})

  test('Extension commands', async () => {
    const extension = vscode.extensions.getExtension('onflow.cadence')
    await extension?.activate()

    assert.strictEqual(extension?.isActive, true)

    await vscode.commands.executeCommand(cmd.RESTART_SERVER)
    assert.strictEqual(ext.getEmulatorState(), EmulatorState.Stopped)

    await delay(1)

    await vscode.commands.executeCommand(cmd.START_EMULATOR)
    assert.strictEqual(ext.getEmulatorState(), EmulatorState.Started)

    await vscode.commands.executeCommand(cmd.CREATE_ACCOUNT)
    assert.strictEqual(ext.getActiveAccount()?.address, 'e03daebed8ca0615')
    // assert.strictEqual(extension.config.getAccount(1)?.address, '01cf0e2f2f715450')
  }).timeout(10000)
})
