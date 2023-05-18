import { EmulatorController, EmulatorState } from '../../src/emulator/emulator-controller'
import { getMockSettings } from '../mock/mockSettings'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { before, after } from 'mocha'
import * as assert from 'assert'
import { closeTerminalEmulator, startTerminalEmulator } from './terminal-emulator'
import { env } from 'vscode'
import { filter, firstValueFrom } from 'rxjs'

suite('Emulator Controller', () => {
  let emuCtrl: EmulatorController
  let settings: Settings

  before(function () {
    this.timeout(MaxTimeout)
    settings = getMockSettings()
    flowConfig.setConfigPath(settings.customConfigPath)
    emuCtrl = new EmulatorController(settings)
  })

  after(async function () {
    this.timeout(MaxTimeout)
    await closeTerminalEmulator(waitForEmulatorClosed)
    await emuCtrl.deactivate()
  })

  async function waitForEmulatorActive (): Promise<void> {
    await firstValueFrom(emuCtrl.api.emulatorState$.pipe(filter(state => state === EmulatorState.Connected)))
  }

  async function waitForEmulatorClosed (): Promise<void> {
    await firstValueFrom(emuCtrl.api.emulatorState$.pipe(filter(state => state === EmulatorState.Disconnected)))
  }

  test('Sync Emulator State', async () => {
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)
    assert.strictEqual(emuCtrl.getState(), EmulatorState.Connected)

    await closeTerminalEmulator(waitForEmulatorClosed)
    assert.strictEqual(emuCtrl.getState(), EmulatorState.Disconnected)

    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)
    assert.strictEqual(emuCtrl.getState(), EmulatorState.Connected)
  }).timeout(MaxTimeout)

  test('Get Active Account', async () => {
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)
    const activeAccount = await emuCtrl.getActiveAccount()
    assert.strictEqual(activeAccount?.getName(), 'Alice')
  }).timeout(MaxTimeout)

  test('Create New Account', async () => {
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)
    await emuCtrl.createNewAccount()
    const activeAccount = await emuCtrl.getActiveAccount()
    assert.strictEqual(activeAccount?.getName(), 'Eve')
  }).timeout(MaxTimeout)

  test('Copy Account to Clipboard', async () => {
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)
    const activeAccount = await emuCtrl.getActiveAccount()
    await emuCtrl.copyActiveAccount()
    const clip = await env.clipboard.readText()
    assert.strictEqual(clip, activeAccount?.fullName())
  }).timeout(MaxTimeout)
})
