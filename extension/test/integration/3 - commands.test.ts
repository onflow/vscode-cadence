import { getMockSettings } from '../mock/mockSettings'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { before } from 'mocha'
import * as assert from 'assert'
import { ext, testActivate } from '../../src/main'
import { EmulatorState } from '../../src/emulator/emulator-controller'
import { startTerminalEmulator } from './terminal-emulator'
import * as commands from '../../src/commands/command-constants'
import { delay } from '..'

const executionDelay = 5

suite('Extension Commands', () => {
  let settings: Settings

  before(async () => {
    settings = getMockSettings()
    flowConfig.setConfigPath(settings.customConfigPath)
    await testActivate(settings)
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

  // Note: Can't test switch account since there's no way to select a UI component
})
