import * as assert from 'assert'
import { before, after } from 'mocha'
import { getMockSettings } from '../mock/mockSettings'
import { EmulatorState, LanguageServerAPI } from '../../src/emulator/server/language-server'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import { GetAccountsReponse } from '../../src/emulator/server/responses'
import { Account } from '../../src/emulator/account'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { closeTerminalEmulator, startTerminalEmulator } from './terminal-emulator'
import { filter, firstValueFrom } from 'rxjs'
import { delay } from '../../src/utils/utils'

suite('Language Server & Emulator Integration', () => {
  let LS: LanguageServerAPI
  let settings: Settings

  before(async function () {
    this.timeout(MaxTimeout)
    // Initialize language server
    settings = getMockSettings()
    flowConfig.setConfigPath(settings.customConfigPath)
    LS = new LanguageServerAPI(settings)
    await LS.activate()
  })

  after(async function () {
    this.timeout(MaxTimeout)
    await closeTerminalEmulator(waitForEmulatorClosed)
    await LS.deactivate()
  })

  async function waitForEmulatorActive (): Promise<void> {
    await firstValueFrom(LS.emulatorState$.pipe(filter(state => state === EmulatorState.Connected)))
  }

  async function waitForEmulatorClosed (): Promise<void> {
    await firstValueFrom(LS.emulatorState$.pipe(filter(state => state === EmulatorState.Disconnected)))
  }

  test('Language Server Client', async () => {
    await LS.startClient(false)
    assert.notStrictEqual(LS.client, undefined)
    assert.strictEqual(LS.client?.isRunning(), true)
    assert.strictEqual(LS.emulatorConnected(), false)
  })

  test('Emulator Connection', async () => {
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)
    await closeTerminalEmulator(waitForEmulatorClosed)
    await waitForEmulatorClosed()
  }).timeout(MaxTimeout)

  test('Account Switching', async () => {
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)

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
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)

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
