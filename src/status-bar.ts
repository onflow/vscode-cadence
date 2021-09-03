import {
  window,
  StatusBarItem,
  StatusBarAlignment
} from 'vscode'
import { Account } from './account'
import { SWITCH_ACCOUNT, START_EMULATOR, STOP_EMULATOR } from './commands'
import { EmulatorState } from './extension'

export function createEmulatorStatusBarItem (): StatusBarItem {
  return window.createStatusBarItem(StatusBarAlignment.Left, 200)
}

export function updateEmulatorStatusBarItem (statusBarItem: StatusBarItem, emulatorState: EmulatorState): void {
  switch (emulatorState) {
    case EmulatorState.Stopped:
      statusBarItem.command = START_EMULATOR
      statusBarItem.text = '$(debug-start) Start Flow Emulator'
      break
    case EmulatorState.Starting:
      statusBarItem.command = undefined
      statusBarItem.text = '$(loading~spin) Emulator starting...'
      break
    case EmulatorState.Started:
      statusBarItem.command = STOP_EMULATOR
      statusBarItem.text = '$(debug-stop) Stop Flow Emulator'
      break
  }

  statusBarItem.show()
}

export function createActiveAccountStatusBarItem (): StatusBarItem {
  const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100)
  statusBarItem.command = SWITCH_ACCOUNT
  return statusBarItem
}

export function updateActiveAccountStatusBarItem (statusBarItem: StatusBarItem, activeAccount: Account | null): void {
  if (activeAccount == null) {
    statusBarItem.hide()
    return
  }

  statusBarItem.text = `$(key) Active account: ${activeAccount.fullName()}`
  statusBarItem.show()
}
