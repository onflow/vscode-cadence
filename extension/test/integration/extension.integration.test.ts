import * as assert from 'assert'
// import * as cmd from '../../src/commands/command-constants'
// import { EmulatorState } from '../../src/emulator/emulator-controller'
// import { delay } from './index'
import * as vscode from 'vscode'
import * as path from 'path'
import { before } from 'mocha'
import { delay } from './index'

suite('Extension Test Suite', () => {
  before(() => {
    vscode.window.showInformationMessage('Start all tests.')
      .then(() => {}, () => {})
  })

  test('Extension commands', async () => {
    console.log('Activate Extension')
    const extension = vscode.extensions.getExtension('onflow.cadence')

    console.log('Open NonFungibleToken.cdc')
    const setting: vscode.Uri = vscode.Uri.parse(path.join(__dirname, '/fixtures/workspace/NonFungibleToken.cdc'))
    vscode.workspace.openTextDocument(setting).then((a: vscode.TextDocument) => {
      void vscode.window.showTextDocument(a, 1, false).then(e => {})
    }, (error: any) => {
      console.error(error)
    })

    await delay(2)

    const ext = await extension?.activate()
    assert.strictEqual(extension?.isActive, true)
    void ext

    // await vscode.commands.executeCommand(cmd.RESTART_SERVER)
    // assert.strictEqual(ext.getEmulatorState(), EmulatorState.Stopped)

    // await delay(10)

    // console.log('Start Emulator')
    // await vscode.commands.executeCommand(cmd.START_EMULATOR)
    // await delay(3)
    // assert.strictEqual(ext.getEmulatorState(), EmulatorState.Started)

    // await vscode.commands.executeCommand(cmd.CREATE_ACCOUNT)
    // assert.strictEqual(ext.getActiveAccount()?.address, 'e03daebed8ca0615')
  }).timeout(100000)
})
