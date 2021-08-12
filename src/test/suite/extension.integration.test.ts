import * as assert from 'assert'

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode'
import { Config } from '../../config'

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.')
    .then(() => {}, () => {})

  test('creates config', async () => {
    const c = new Config('flowCommand', 2, 'strict')

    assert.strictEqual(c.accounts.length, 0)
    assert.strictEqual(c.getActiveAccount(), null)

    assert.strictEqual(await c.readLocalConfig(), true)
  })

  test('Extension is registered', async () => {
    const ext = vscode.extensions.getExtension('onflow.cadence')
    await ext?.activate()

    assert.strictEqual(ext?.isActive, true)

    const r = await vscode.commands.executeCommand('cadence.restartServer')
    console.log('##', r)
  }).timeout(10000)
})
