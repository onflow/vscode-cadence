import { getMockSettings } from '../mock/mockSettings'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { before, after } from 'mocha'
import * as assert from 'assert'
import { ext, testActivate } from '../../src/main'
import { closeTerminalEmulator, startTerminalEmulator } from './terminal-emulator'
import * as commands from '../../src/commands/command-constants'
import { filter, firstValueFrom } from 'rxjs'
import { EmulatorState } from '../../src/emulator/server/language-server'

suite('Extension Commands', () => {
  let settings: Settings

  before(async function () {
    this.timeout(MaxTimeout)
    settings = getMockSettings()
    flowConfig.setConfigPath(settings.customConfigPath)
    await testActivate(settings)
  })

  after(async function () {
    this.timeout(MaxTimeout)
    await closeTerminalEmulator(waitForEmulatorClosed)
    await ext?.deactivate()
  })

  async function waitForEmulatorActive (): Promise<void> {
    if (ext == null) return
    await firstValueFrom(ext.emulatorCtrl.api.emulatorState$.pipe(filter(state => state === EmulatorState.Connected)))
  }

  async function waitForEmulatorClosed (): Promise<void> {
    if (ext == null) return
    await firstValueFrom(ext.emulatorCtrl.api.emulatorState$.pipe(filter(state => state === EmulatorState.Disconnected)))
  }

  test('Command: Create Account', async () => {
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)
    assert.strictEqual(await ext?.executeCommand(commands.CREATE_ACCOUNT), true)
    const activeAccount = await ext?.getActiveAccount()
    assert.strictEqual(activeAccount?.name, 'Eve')
  }).timeout(MaxTimeout)

  test('Command: Restart Language Server', async () => {
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)
    assert.strictEqual(await ext?.executeCommand(commands.RESTART_SERVER), true)
  }).timeout(MaxTimeout)

  test('Command: Check Dependencies', async () => {
    await startTerminalEmulator(waitForEmulatorActive, waitForEmulatorClosed)
    assert.strictEqual(await ext?.executeCommand(commands.CHECK_DEPENDENCIES), true)
    await closeTerminalEmulator(waitForEmulatorClosed)
  }).timeout(MaxTimeout)
})
