import * as assert from 'assert'
import { before } from 'mocha'
import { delay } from '../index'
import { getMockSettings } from '../mock/mockSettings'
import { LanguageServerAPI } from '../../src/emulator/server/language-server'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import * as vscode from 'vscode'
import * as depInstaller from '../../src/dependency-installer/dependency-installer'
import { GetAccountsReponse } from '../../src/emulator/server/responses'
import { Account } from '../../src/emulator/account'
import Mocha = require('mocha')

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
  let terminal: vscode.Terminal | null = null

  before(async () => {
    // Initialize language server
    const settings = getMockSettings()
    flowConfig.setConfigPath(settings.customConfigPath)
    LS = new LanguageServerAPI(settings)
  })

  function startEmulatorInTerminal (): vscode.Terminal {
    const settings = getMockSettings()
    const emulatorCommand = `${settings.flowCommand} emulator`
    terminal = vscode.window.createTerminal('Flow Emulator')
    terminal.show()
    terminal.sendText(emulatorCommand)
    return terminal
  }

  Mocha.afterEach(() => {
    terminal?.dispose()
    terminal = null
  })

  test('Language Server Client', async () => {
    await LS.startClient(false)
    assert.notStrictEqual(LS.client, undefined)
    assert.strictEqual(LS.client?.isRunning(), true)
    assert.strictEqual(LS.emulatorConnected(), false)
  })

  test('Emulator Connection', async () => {
    startEmulatorInTerminal()
    await delay(5)
    assert.strictEqual(LS.emulatorConnected(), true)
    terminal?.dispose()
    await delay(5)
    assert.strictEqual(LS.emulatorConnected(), false)
  }).timeout(MaxTimeout)

  test('Account Switching', async () => {
    startEmulatorInTerminal()
    await delay(5)
    assert.strictEqual(LS.emulatorConnected(), true)

    // Get active account
    const accounts: GetAccountsReponse = await LS.getAccounts()
    const numAccounts = accounts.getAccounts().length
    let activeAccount: Account | null = accounts.getActiveAccount()

    for (let i = 0; i < numAccounts; i++) {
      if (activeAccount == null) {
        assert.fail('active account is null')
      }

      const nextAccount = accounts.getAccounts()[(activeAccount.index + 1) % numAccounts]
      await LS.switchActiveAccount(nextAccount)
      activeAccount = (await LS.getAccounts()).getActiveAccount()
      assert.equal(activeAccount?.address, nextAccount.address)
    }
  }).timeout(MaxTimeout)

  test('Account Creation', async () => {
    startEmulatorInTerminal()
    await delay(5)
    assert.strictEqual(LS.emulatorConnected(), true)

    const createAccounts = 10
    for (let i = 0; i < createAccounts; i++) {
      const newAccount = await LS.createAccount()
      await LS.switchActiveAccount(newAccount)
      const activeAccount = (await LS.getAccounts()).getActiveAccount()
      assert.equal(newAccount.address, activeAccount?.address)
    }
  }).timeout(MaxTimeout)
})
