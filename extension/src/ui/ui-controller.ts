/* UIController initializes and updates all UI components of the extension */
import { StatusBarUI } from './components/status-bar'
import { ext } from '../main'
import { EmulatorState } from '../emulator/emulator-controller'

export class UIController {
  #statusBar: StatusBarUI

  constructor () {
    // Initialize status bar
    this.#statusBar = new StatusBarUI(EmulatorState.Disconnected, null)
  }

  async emulatorStateChanged (): Promise<void> {
    // Update status bar with current emulator state and active account
    if (ext != null) {
      this.#statusBar.emulatorStateChanged(ext.getEmulatorState(), await ext.getActiveAccount())
    }
  }

  hideUI (): void {
    this.#statusBar.hideStatusBar()
  }

  refreshUI (): void {
    this.#statusBar.showStatusBar()
  }
}
