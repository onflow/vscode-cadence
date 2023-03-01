import * as vscode from 'vscode'
import { delay } from '../index'
import { getMockSettings } from '../mock/mockSettings'

let terminal: vscode.Terminal | null = null
const emulatorCommand = `${getMockSettings().flowCommand} emulator`

export async function closeTerminalEmulator (emulatorClosed: () => Promise<boolean>): Promise<void> {
  if (terminal !== null) {
    terminal.dispose()
    terminal = null
  }
  await waitForEmulator(emulatorClosed)
}

export async function startTerminalEmulator (emulatorActive: () => Promise<boolean>,
  emulatorClosed: () => Promise<boolean>): Promise<boolean> {
  await closeTerminalEmulator(emulatorClosed)
  terminal = vscode.window.createTerminal('Flow Emulator')
  terminal.show()
  terminal.sendText(emulatorCommand)
  return await waitForEmulator(emulatorActive)
}

// Waits for emulator to be connected/ disconnected
export async function waitForEmulator (emulatorStateCheck: () => Promise<boolean>): Promise<boolean> {
  const timeoutSeconds = 10
  for (let i = 0; i < timeoutSeconds; i++) {
    if (await emulatorStateCheck()) {
      return true
    }
    await delay(1)
  }
  return false
}
