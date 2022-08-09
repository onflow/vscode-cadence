import * as assert from 'assert'
// import * as cmd from '../../src/commands/command-constants'
// import { EmulatorState } from '../../src/emulator/emulator-controller'
// import { delay } from './index'
import * as vscode from 'vscode'
import { before, Done } from 'mocha'

suite('Extension Test Suite', () => {
  before(() => {
    vscode.window.showInformationMessage('Start all tests.')
    .then(() => {}, () => {})
  })

  test('Extension commands', async () => {
    console.log('Activate Extension')
    const extension = vscode.extensions.getExtension('onflow.cadence')
    const ext = await extension?.activate()
    assert.strictEqual(extension?.isActive, true)

    console.log('Open NonFungibleToken.cdc')
    var setting: vscode.Uri = vscode.Uri.parse(__dirname + '/fixtures/workspace/NonFungibleToken.cdc');
    vscode.workspace.openTextDocument(setting).then((a: vscode.TextDocument) => {
        vscode.window.showTextDocument(a, 1, false).then(e => {})
    }, (error: any) => {
        console.error(error)
    })
    
    //await vscode.commands.executeCommand(cmd.RESTART_SERVER)
    //assert.strictEqual(ext.getEmulatorState(), EmulatorState.Stopped)

    //await delay(10)

    //console.log('Start Emulator')
    //await vscode.commands.executeCommand(cmd.START_EMULATOR)
    //await delay(3)
    //assert.strictEqual(ext.getEmulatorState(), EmulatorState.Started)

   //await vscode.commands.executeCommand(cmd.CREATE_ACCOUNT)
    //assert.strictEqual(ext.getActiveAccount()?.address, 'e03daebed8ca0615')

  }).timeout(100000)
})
