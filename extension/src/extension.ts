/* The extension */
import { EmulatorState, EmulatorController } from './emulator/emulator-controller'
import { CommandController } from './commands/command-controller'
import { refreshCodeLenses } from './utils/utils'
import { Account } from './emulator/account'
import { UIController } from './ui/ui-controller'
import { ExtensionContext } from 'vscode'
import { CadenceDebugger } from './utils/debugger'

// The container for all data relevant to the extension.
export class Extension {
  // The extension singleton
  static #instance: Extension

  static initialize (ctx: ExtensionContext): Extension {
    Extension.#instance = new Extension(ctx)
    return Extension.#instance
  }

  ctx: ExtensionContext
  debugger: CadenceDebugger
  uiCtrl: UIController
  commands: CommandController
  emulatorCtrl: EmulatorController

  private constructor (ctx: ExtensionContext) {
    this.ctx = ctx

    // Note: Language Server Client should be initialized here when we remove client-side emulator

    // Initialize Cadence Debugger
    this.debugger = new CadenceDebugger(this.ctx)

    // Initialize Emulator
    this.emulatorCtrl = new EmulatorController(this.ctx.storagePath, this.ctx.globalStoragePath)

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
    // Update language server API with emulator state
    this.emulatorCtrl.api.changeEmulatorState(this.getEmulatorState())
      .then(() => {}, () => {})
    refreshCodeLenses()

    // Update UI
    this.uiCtrl.emulatorStateChanged()
  }
}
