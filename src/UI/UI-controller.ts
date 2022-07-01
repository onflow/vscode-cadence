/* UIController initializes and updates all UI components of the extension */
import { StatusBarUI } from "./status-bar";
import { ext } from "../extension";

export class UIController {
    #statusBar: StatusBarUI

    constructor() {
        // Initialize status bar
        this.#statusBar = new StatusBarUI(ext.getEmulatorState(), ext.getActiveAccount())
    }

    emulatorStateChanged () {
        // Update status bar with current emulator state and active account
        this.#statusBar.emulatorStateChanged(ext.getEmulatorState(), ext.getActiveAccount())
    }

    hideUI() {
        this.#statusBar.hideStatusBar()
    }

    refreshUI() {
        this.#statusBar.showStatusBar()
    }
}