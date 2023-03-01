import { EmulatorController, EmulatorState } from '../../src/emulator/emulator-controller'
import { getMockSettings } from '../mock/mockSettings'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { before, after } from 'mocha'
import * as assert from 'assert'
import { closeTerminalEmulator, startTerminalEmulator } from './terminal-emulator'
import { env } from 'vscode'

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
    await closeTerminalEmulator(emulatorClosed)
    emuCtrl.deactivate()
  })

  async function emulatorActive (): Promise<boolean> {
    await emuCtrl.syncEmulatorState()
    return emuCtrl.getState() === EmulatorState.Connected
  }

  async function emulatorClosed (): Promise<boolean> {
    await emuCtrl.syncEmulatorState()
    return emuCtrl.getState() === EmulatorState.Disconnected
  }

  test('Sync Emulator State', async () => {
    assert.strictEqual(await startTerminalEmulator(emulatorActive, emulatorClosed), true)
    await emuCtrl.syncEmulatorState()
    assert.strictEqual(emuCtrl.getState(), EmulatorState.Connected)

    await closeTerminalEmulator(emulatorClosed)
    await emuCtrl.syncEmulatorState()
    assert.strictEqual(emuCtrl.getState(), EmulatorState.Disconnected)

    assert.strictEqual(await startTerminalEmulator(emulatorActive, emulatorClosed), true)
    await emuCtrl.syncEmulatorState()
    assert.strictEqual(emuCtrl.getState(), EmulatorState.Connected)
  }).timeout(MaxTimeout)

  test('Get Active Account', async () => {
    assert.strictEqual(await startTerminalEmulator(emulatorActive, emulatorClosed), true)
    const activeAccount = emuCtrl.getActiveAccount()
    assert.strictEqual(activeAccount?.getName(), 'Alice')
  }).timeout(MaxTimeout)

  test('Create New Account', async () => {
    assert.strictEqual(await startTerminalEmulator(emulatorActive, emulatorClosed), true)
    await emuCtrl.createNewAccount()
    await emuCtrl.syncEmulatorState()
    const activeAccount = emuCtrl.getActiveAccount()
    assert.strictEqual(activeAccount?.getName(), 'Eve')
  }).timeout(MaxTimeout)

  test('Copy Account to Clipboard', async () => {
    assert.strictEqual(await startTerminalEmulator(emulatorActive, emulatorClosed), true)
    const activeAccount = emuCtrl.getActiveAccount()
    emuCtrl.copyActiveAccount()
    const clip = await env.clipboard.readText()
    assert.strictEqual(clip, activeAccount?.fullName())
    await closeTerminalEmulator(emulatorClosed)
  }).timeout(MaxTimeout)
})
