/* StatusBar UI Component */
import {
  window,
  StatusBarItem,
  StatusBarAlignment
} from 'vscode'
import { Account } from '../../emulator/account'
import * as commandID from '../../commands/command-constants'
import { EmulatorState } from '../../emulator/emulator-controller'

export class StatusBarUI {
  #emulatorStatusItem: StatusBarItem
  #accountActiveItem: StatusBarItem

  constructor (initEmulatorState: EmulatorState, initActiveAccount: Account | null) {
    // Initialize emulator status item
    this.#emulatorStatusItem = this.#createEmulatorStatusBarItem()
    this.#updateEmulatorStatusBarItem(initEmulatorState)

    // Initialize active account item
    this.#accountActiveItem = this.#createActiveAccountStatusBarItem()
    this.#updateActiveAccountStatusBarItem(initActiveAccount)
  }

  // Updates the UI based on new emulator state
  emulatorStateChanged (emulatorState: EmulatorState, activeAccount: Account | null): void {
    this.#updateEmulatorStatusBarItem(emulatorState)
    this.#updateActiveAccountStatusBarItem(activeAccount)
  }

  #createEmulatorStatusBarItem (): StatusBarItem {
    return window.createStatusBarItem(StatusBarAlignment.Left, 200)
  }

  #updateEmulatorStatusBarItem (emulatorState: EmulatorState): void {
    switch (emulatorState) {
      case EmulatorState.Connected:
        this.#emulatorStatusItem.command = undefined
        this.#emulatorStatusItem.text = '$(vm-active) Flow Emulator Connected'
        break
      case EmulatorState.Disconnected:
        this.#emulatorStatusItem.command = undefined
        this.#emulatorStatusItem.text = '$(vm-outline) Flow Emulator Disconnected'
        break
    }
    this.#emulatorStatusItem.show()
  }

  #createActiveAccountStatusBarItem (): StatusBarItem {
    const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100)
    statusBarItem.command = commandID.SWITCH_ACCOUNT
    return statusBarItem
  }

  #updateActiveAccountStatusBarItem (activeAccount: Account | null): void {
    if (activeAccount == null) {
      this.#accountActiveItem.hide()
      return
    }

    this.#accountActiveItem.text = `$(key) Active account: ${activeAccount.fullName()}`
    this.#accountActiveItem.show()
  }

  showStatusBar (): void {
    this.#emulatorStatusItem.show()
    this.#accountActiveItem.show()
  }

  hideStatusBar (): void {
    this.#emulatorStatusItem.hide()
    this.#accountActiveItem.hide()
  }
}
