/* The extension */
import { EmulatorState, EmulatorController } from './emulator/emulator-controller'
import { CommandController } from './commands/command-controller'
import { refreshCodeLenses } from './utils/utils'
import { Account } from './emulator/account'
import { UIController } from './ui/ui-controller'
import { ExtensionContext } from 'vscode'
import { DEBUG_LOG } from './utils/debug'
import { DependencyInstaller } from './dependency-installer/dependency-installer'

// The container for all data relevant to the extension.
export class Extension {
  // The extension singleton
  static #instance: Extension

  static initialize (ctx: ExtensionContext): Extension {
    Extension.#instance = new Extension(ctx)
    return Extension.#instance
  }

  ctx: ExtensionContext
  #dependencyInstaller: DependencyInstaller
  #uiCtrl: UIController
  #commands: CommandController
  emulatorCtrl: EmulatorController

  private constructor (ctx: ExtensionContext) {
    this.ctx = ctx

    // Check for any missing dependencies
    this.#dependencyInstaller = new DependencyInstaller()

    // Initialize Emulator
    this.emulatorCtrl = new EmulatorController()

    // Initialize UI
    this.#uiCtrl = new UIController()

    // Initialize ExtensionCommands
    this.#commands = new CommandController()
  }

  // Called on exit
  async deactivate (): Promise<void> {
    try {
      this.emulatorCtrl.deactivate()
    } catch (err) {
      if (err instanceof Error) {
        DEBUG_LOG('Extension deactivate error: ' + err.message)
      }
      DEBUG_LOG('Extension deactivate error: unknown')
    }
  }

  getEmulatorState (): EmulatorState {
    return this.emulatorCtrl.getState()
  }

  getActiveAccount (): Account {
    return this.emulatorCtrl.getActiveAccount()
  }

  emulatorStateChanged (): void {
    // Sync account data with LS
    if (this.getEmulatorState() === EmulatorState.Started) {
      void this.emulatorCtrl.syncAccountData()
    }

    // Update UI
    this.#uiCtrl.emulatorStateChanged()
    refreshCodeLenses()
  }

  checkDependencies (): void {
    this.#dependencyInstaller.checkDependencies()
  }
}
