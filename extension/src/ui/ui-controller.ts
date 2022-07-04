/* UIController initializes and updates all UI components of the extension */
import { StatusBarUI } from './components/status-bar'
import { ext } from '../main'
import { DEBUG_LOG } from '../utils/debug'
import { EmulatorState } from '../emulator/emulator-controller'

export class UIController {
    #statusBar: StatusBarUI

    constructor () {
      // Initialize status bar
      DEBUG_LOG('UICtrl init status bar')
      this.#statusBar = new StatusBarUI(EmulatorState.Stopped, null)// ext.getActiveAccount())
    }

    emulatorStateChanged (): void {
      DEBUG_LOG('UICtrl emulatorStateChanged()')
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
