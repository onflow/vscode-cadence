import * as assert from 'assert'
import { before } from 'mocha'
import { delay } from '../index'
import { getMockSettings } from '../mock/mockSettings'
import { LanguageServerAPI } from '../../src/emulator/server/language-server'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import * as vscode from 'vscode'
import * as depInstaller from '../../src/dependency-installer/dependency-installer'

const MaxTimeout = 100000

// Note: Dependency installation must run before LS tests
suite('Dependency Installer Integration Test', () => {
  test('Install Missing Dependencies', async () => {
    const dependencyInstaller = new depInstaller.DependencyInstaller()
    const noError = dependencyInstaller.installMissingDependencies()
    assert.equal(noError, true)
  }).timeout(MaxTimeout)
})

suite('Language Server Integration Tests', () => {
  let LS: LanguageServerAPI

  before(async () => {
    // Initialize language server
    const settings = getMockSettings()
    flowConfig.setConfigPath(settings.customConfigPath)
    LS = new LanguageServerAPI(settings)
  })

  test('Language Server Client', async () => {
    await LS.startClient(false)
    assert.notStrictEqual(LS.client, undefined)
    assert.strictEqual(LS.client?.isRunning(), true)
    assert.strictEqual(LS.emulatorConnected(), false)
  })

  test('Emulator Connection', async () => {
    // Start emulator in a terminal
    const settings = getMockSettings()
    const emulatorCommand = `${settings.flowCommand} emulator`
    const terminal = vscode.window.createTerminal('Flow Emulator')
    terminal.show()
    terminal.sendText(emulatorCommand)

    await delay(10)
    assert.strictEqual(LS.emulatorConnected(), true)

    terminal.dispose()
    await delay(10)

    assert.strictEqual(LS.emulatorConnected(), false)
  }).timeout(MaxTimeout)

  // TODO: Test Account Switching
  // TODO: Test Account Creation
})
