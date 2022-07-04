import * as assert from 'assert'
import * as cmd from '../../commands/command-controller'
import * as vscode from 'vscode'
import { Config } from '../../emulator/local/config'
import { EmulatorState, Extension } from '../../main'
import { delay } from './index'

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.')
    .then(() => {}, () => {})

  test('Creates config', async () => {
    const c = new Config('flowCommand', 2, 'strict')

    assert.strictEqual(c.accounts.length, 0)
    assert.strictEqual(c.getActiveAccount(), null)

    assert.strictEqual(await c.readLocalConfig(), true)
  })

  test('Extension commands', async () => {
    const ext = vscode.extensions.getExtension('onflow.cadence')
    await ext?.activate()

    assert.strictEqual(ext?.isActive, true)

    const extension: Extension = await vscode.commands.executeCommand(cmd.RESTART_SERVER)
    assert.strictEqual(extension.getEmulatorState(), EmulatorState.Stopped)

    await delay(1)

    const emulatorState = await vscode.commands.executeCommand(cmd.START_EMULATOR)
    assert.strictEqual(emulatorState, EmulatorState.Started)

    await vscode.commands.executeCommand(cmd.CREATE_ACCOUNT)
    assert.strictEqual(extension.config.getActiveAccount()?.address, 'e03daebed8ca0615')
    assert.strictEqual(extension.config.getAccount(1)?.address, '01cf0e2f2f715450')
  }).timeout(10000)
})
