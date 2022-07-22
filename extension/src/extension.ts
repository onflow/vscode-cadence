/* The extension */
import { EmulatorState, EmulatorController } from './emulator/emulator-controller'
import { CommandController } from './commands/command-controller'
import { refreshCodeLenses } from './utils/utils'
import { Account } from './emulator/account'
import { UIController } from './ui/ui-controller'
import { ExtensionContext, window } from 'vscode'
import { DependencyInstaller } from './utils/dependency-installer'
import { INSTALL_MISSING_DEPENDENCIES } from './utils/strings'

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

    // Check for any missing dependencies
    this.#checkDependencies()

    // Initialize Emulator
    this.emulatorCtrl = new EmulatorController(this.ctx.storagePath, this.ctx.globalStoragePath)

    // Initialize UI
    this.uiCtrl = new UIController()

    // Initialize ExtensionCommands
    this.commands = new CommandController()
  }

  #checkDependencies (): void {
    const dependencyInstaller = new DependencyInstaller()

    if (!dependencyInstaller.allInstalled()) {
      const missing: string[] = dependencyInstaller.getMissingDependenciesList()

      // Prompt user to install missing dependencies
      window.showErrorMessage(
        'Not all dependencies are installed: ' + missing.join(', '),
        INSTALL_MISSING_DEPENDENCIES
      ).then((choice) => {
        if (choice === INSTALL_MISSING_DEPENDENCIES) {
          dependencyInstaller.installMissingDependencies()
        }
      }, () => {})
    }
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
