import * as vscode from 'vscode'
import { getMockSettings } from '../mock/mockSettings'
import { envVars } from '../../src/utils/shell/env-vars'

const emulatorCommand = `${getMockSettings().flowCommand} emulator`

export async function closeTerminalEmulator (
  waitForEmulatorClosed: () => Promise<void>
): Promise<void> {
  // Close any existing emulator
  vscode.window.terminals.forEach((terminal) => terminal.dispose())

  // Wait for emulator to close
  await waitForEmulatorClosed()
}

export async function startTerminalEmulator (
  waitForEmulatorActive: () => Promise<void>,
  waitForEmulatorClosed: () => Promise<void>
): Promise<void> {
  // Close any existing emulator
  await closeTerminalEmulator(waitForEmulatorClosed)

  // Start emulator
  const terminal = vscode.window.createTerminal({name: 'Flow Emulator', env: await envVars.getValue()})
  terminal.show()
  terminal.sendText(emulatorCommand)

  // Wait for emulator to activate
  await waitForEmulatorActive()
}
