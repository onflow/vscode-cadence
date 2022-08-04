import * as assert from 'assert'
//import * as cmd from '../../src/commands/command-constants'
import * as vscode from 'vscode'
//import { EmulatorState } from '../../src/emulator/emulator-controller'
//import { ext } from '../../src/main'
//import { delay } from './index'
import { before } from 'mocha'

suite('Extension Test Suite', () => {
  before(() => {
    vscode.window.showInformationMessage('Start all tests.')
    .then(() => {}, () => {})
  })


  test('Extension commands', async () => {
    console.log("HERE!")
    const extension = vscode.extensions.getExtension('onflow.cadence')
    const ext = extension?.activate()

    if (ext === undefined) {
      console.log('EXT IS UNDEFINED')
    }

    assert.strictEqual(extension?.isActive, true)

    //await vscode.commands.executeCommand(cmd.RESTART_SERVER)
    //assert.strictEqual(ext.getEmulatorState(), EmulatorState.Stopped)

    //await delay(10)

    //await vscode.commands.executeCommand(cmd.START_EMULATOR)
    //assert.strictEqual(ext.getEmulatorState(), EmulatorState.Started)

   //await vscode.commands.executeCommand(cmd.CREATE_ACCOUNT)
    //assert.strictEqual(ext.getActiveAccount()?.address, 'e03daebed8ca0615')
  })
})
