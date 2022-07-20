/* The extension */
import { EmulatorState, EmulatorController } from './emulator/emulator-controller'
import { CommandController } from './commands/command-controller'
import { refreshCodeLenses } from './utils/utils'
import { Account } from './emulator/account'
import { UIController } from './ui/ui-controller'
import { ExtensionContext } from 'vscode'

// The container for all data relevant to the extension.
export class Extension {
  // The extension singleton
  static #instance: Extension

  static initialize (ctx: ExtensionContext): Extension {
    Extension.#instance = new Extension(ctx)
    return Extension.#instance
  }

  ctx: ExtensionContext
  uiCtrl: UIController
  commands: CommandController
  emulatorCtrl: EmulatorController

  private constructor (ctx: ExtensionContext) {
    this.ctx = ctx

    // Note: Language Server Client should be initialized here when we remove client-side emulator

    // Initialize Emulator
    this.emulatorCtrl = new EmulatorController()

    // Initialize UI
    this.uiCtrl = new UIController()

    // Initialize ExtensionCommands
    this.commands = new CommandController()
  }

  getEmulatorState (): EmulatorState {
    return this.emulatorCtrl.getState()
  }

  getActiveAccount (): Account | null {
    return this.emulatorCtrl.getActiveAccount()
  }

  emulatorStateChanged (): void {
    // Sync account data with LS
    void this.emulatorCtrl.syncAccountData()

    // Update UI
    this.uiCtrl.emulatorStateChanged()
    refreshCodeLenses()
  }
}
