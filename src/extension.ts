/* VS Code Cadence Extension */
import { ExtensionContext } from 'vscode'
import { EmulatorState, EmulatorController } from './emulator/emulator-controller'
import { CommandController } from './commands/command-controller'
import { refreshCodeLenses } from './utils/utils'
import { StatusBarUI } from './UI/status-bar'
import { Account } from './emulator/account'
import { UIController } from './UI/UI-controller'

// Global extension variable to update UI
export let ext: Extension

// Called by VS Code when the extension starts up
export async function activate (ctx: ExtensionContext): Promise<void> {
  // Initialize the extension
  ext = new Extension(ctx)
}

// Called by VS Code when the extension terminates
export function deactivate (): Thenable<void> | undefined {
  return ext.emulatorCtrl.api === undefined ? undefined : ext.emulatorCtrl.api.client.stop()
}

// The container for all data relevant to the extension.
export class Extension {
  ctx: ExtensionContext
  UICtrl: UIController
  commands: CommandController
  emulatorCtrl: EmulatorController

  constructor (ctx: ExtensionContext) {
    this.ctx = ctx
  
    // Initialize Emulator
    this.emulatorCtrl = new EmulatorController(this.ctx.storagePath, this.ctx.globalStoragePath)

   // Initialize ExtensionCommands
   this.commands = new CommandController()

   // Initialize UI
   this.UICtrl = new UIController()
  }

  getEmulatorState (): EmulatorState {
    return this.emulatorCtrl.getState()
  }

  getActiveAccount (): Account | null {
    return this.emulatorCtrl.getActiveAccount() //TODO: Convert this to an Account?
  }

  emulatorStateChanged() {
    // Update language server API with emulator state
    this.emulatorCtrl.api.changeEmulatorState(this.getEmulatorState())
      .then(() => {}, () => {})
    refreshCodeLenses()

    // Update UI
    this.UICtrl.emulatorStateChanged()
  }
}
