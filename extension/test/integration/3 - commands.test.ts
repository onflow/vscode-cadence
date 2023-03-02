import { getMockSettings } from '../mock/mockSettings'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { before, after } from 'mocha'
import * as assert from 'assert'
import { ext, testActivate } from '../../src/main'
import { EmulatorState } from '../../src/emulator/emulator-controller'
import { closeTerminalEmulator, startTerminalEmulator } from './terminal-emulator'
import * as commands from '../../src/commands/command-constants'
import { delay } from '..'

const executionDelay = 5

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
    await closeTerminalEmulator(emulatorClosed)
    await ext?.deactivate()
  })

  async function emulatorActive (): Promise<boolean> {
    await ext?.emulatorCtrl.syncEmulatorState()
    return ext?.getEmulatorState() === EmulatorState.Connected
  }

  async function emulatorClosed (): Promise<boolean> {
    await ext?.emulatorCtrl.syncEmulatorState()
    return ext?.getEmulatorState() === EmulatorState.Disconnected
  }

  test('Command: Create Account', async () => {
    await startTerminalEmulator(emulatorActive, emulatorClosed)
    assert.strictEqual(ext?.executeCommand(commands.CREATE_ACCOUNT), true)
    await delay(executionDelay) // wait for command execution
    const activeAccount = ext?.getActiveAccount()
    assert.strictEqual(activeAccount?.name, 'Eve')
  }).timeout(MaxTimeout)

  test('Command: Restart Language Server', async () => {
    await startTerminalEmulator(emulatorActive, emulatorClosed)
    assert.strictEqual(ext?.executeCommand(commands.RESTART_SERVER), true)
    await delay(executionDelay)
  }).timeout(MaxTimeout)

  test('Command: Check Dependencies', async () => {
    await startTerminalEmulator(emulatorActive, emulatorClosed)
    assert.strictEqual(ext?.executeCommand(commands.CHECK_DEPENDENCIES), true)
    await delay(executionDelay)
    await closeTerminalEmulator(emulatorClosed)
  }).timeout(MaxTimeout)
})
