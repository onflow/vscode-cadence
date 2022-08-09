/* UIController initializes and updates all UI components of the extension */
import { StatusBarUI } from './components/status-bar'
import { ext } from '../main'
import { EmulatorState } from '../emulator/emulator-controller'
import { SidebarUI } from './components/side-bar'

export class UIController {
  #statusBar: StatusBarUI
  #explorer: SidebarUI

  constructor () {
    // Initialize status bar
    this.#statusBar = new StatusBarUI(EmulatorState.Disconnected, null)

    // Initialize explorer
    this.#explorer = new SidebarUI()
  }

  emulatorStateChanged (): void {
    // Update status bar with current emulator state and active account
    this.#statusBar.emulatorStateChanged(ext.getEmulatorState(), ext.getActiveAccount())
  }

  hideUI (): void {
    this.#statusBar.hideStatusBar()
  }

  refreshUI (): void {
    this.#statusBar.showStatusBar()
  }
}
