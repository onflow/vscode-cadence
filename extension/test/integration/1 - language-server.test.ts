import * as assert from 'assert'
import { before, after } from 'mocha'
import { delay } from '../index'
import { getMockSettings } from '../mock/mockSettings'
import { LanguageServerAPI } from '../../src/emulator/server/language-server'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import { GetAccountsReponse } from '../../src/emulator/server/responses'
import { Account } from '../../src/emulator/account'
import { Settings } from '../../src/settings/settings'
import { CONNECTED, DISCONNECTED, MaxTimeout } from '../globals'
import { closeTerminalEmulator, startTerminalEmulator, waitForEmulator } from './terminal-emulator'

suite('Language Server & Emulator Integration', () => {
  let LS: LanguageServerAPI
  let settings: Settings

  before(async function () {
    this.timeout(MaxTimeout)
    // Initialize language server
    settings = getMockSettings()
    flowConfig.setConfigPath(settings.customConfigPath)
    LS = new LanguageServerAPI(settings)
  })

  after(async function () {
    this.timeout(MaxTimeout)
    await closeTerminalEmulator(emulatorClosed)
    LS.deactivate()
  })

  async function emulatorActive (): Promise<boolean> {
    return LS.emulatorConnected() === CONNECTED
  }

  async function emulatorClosed (): Promise<boolean> {
    return LS.emulatorConnected() === DISCONNECTED
  }

  test('Language Server Client', async () => {
    await LS.startClient(false)
    assert.notStrictEqual(LS.client, undefined)
    assert.strictEqual(LS.client?.isRunning(), true)
    assert.strictEqual(LS.emulatorConnected(), false)
  })

  test('Emulator Connection', async () => {
    assert.strictEqual(await startTerminalEmulator(emulatorActive, emulatorClosed), true)
    await closeTerminalEmulator(emulatorClosed)
    assert.strictEqual(await waitForEmulator(emulatorClosed), true)
  }).timeout(MaxTimeout)

  test('Account Switching', async () => {
    assert.strictEqual(await startTerminalEmulator(emulatorActive, emulatorClosed), true)

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
    assert.strictEqual(await startTerminalEmulator(emulatorActive, emulatorClosed), true)

    const createAccounts = 5
    for (let i = 0; i < createAccounts; i++) {
      const newAccount = await LS.createAccount()
      await LS.switchActiveAccount(newAccount)
      const activeAccount = (await LS.getAccounts()).getActiveAccount()
      assert.equal(newAccount.address, activeAccount?.address)
      await delay(0.5)
    }

  }).timeout(MaxTimeout)
})
