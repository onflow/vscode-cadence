/* The extension */
import { EmulatorState, EmulatorController } from './emulator/emulator-controller'
import { CommandController } from './commands/command-controller'
import { refreshCodeLenses } from './utils/utils'
import { Account } from './emulator/account'
import { UIController } from './ui/ui-controller'
import { ExtensionContext } from 'vscode'
import { Settings } from './settings/settings'
import { DEBUG_LOG } from './utils/debug'


// The container for all data relevant to the extension.
export class Extension {
    // The extension
    static #instance: Extension

    static initialize(ctx: ExtensionContext) {
      Extension.#instance = new Extension(ctx)
      return Extension.#instance
    }

    static getInstance() {
      if (!Extension.#instance) {
        // Extension has not been initialized
        return undefined
      } 
      return Extension.#instance
    }

    ctx: ExtensionContext
    UICtrl: UIController
    commands: CommandController
    emulatorCtrl: EmulatorController
  
    constructor (ctx: ExtensionContext) {
        this.ctx = ctx
  
      // Initialize Language Server Client
      // TODO: Language Server should be here instead? Seperate from the emulator.. but needs to communicate still

      // Initialize Emulator
      this.emulatorCtrl = new EmulatorController(this.ctx.storagePath, this.ctx.globalStoragePath)
      DEBUG_LOG("EmulatorCtrl Initialized")

  
     // Initialize UI
     this.UICtrl = new UIController()
     DEBUG_LOG("UIController Initialized")

     // Initialize ExtensionCommands
     this.commands = new CommandController()
     DEBUG_LOG("Commands Initialized")
    }

    getEmulatorState (): EmulatorState {
      const ext = Extension.getInstance()
      return ext ? ext.emulatorCtrl.getState() : EmulatorState.Stopped
    }
  
    getActiveAccount (): Account | null {
      return this.emulatorCtrl.getActiveAccount()
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
  