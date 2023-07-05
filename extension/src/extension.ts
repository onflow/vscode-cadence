/* The extension */
import { EmulatorController } from './emulator/emulator-controller'
import { CommandController } from './commands/command-controller'
import { Account } from './emulator/account'
import { UIController } from './ui/ui-controller'
import { ExtensionContext } from 'vscode'
import { DEBUG_LOG } from './utils/debug'
import { DependencyInstaller } from './dependency-installer/dependency-installer'
import { Settings } from './settings/settings'
import { EmulatorState } from './emulator/server/language-server'

// The container for all data relevant to the extension.
export class Extension {
  // The extension singleton
  static #instance: Extension
  static initialized = false

  static initialize (settings: Settings, ctx?: ExtensionContext): Extension {
    Extension.#instance = new Extension(settings, ctx)
    Extension.initialized = true
    return Extension.#instance
  }

  ctx: ExtensionContext | undefined
  #dependencyInstaller: DependencyInstaller
  #uiCtrl: UIController
  #commands: CommandController
  emulatorCtrl: EmulatorController

  private constructor (settings: Settings, ctx: ExtensionContext | undefined) {
    this.ctx = ctx

    // Initialize UI
    this.#uiCtrl = new UIController()

    // Initialize Emulator
    this.emulatorCtrl = new EmulatorController(settings)
    this.emulatorCtrl.api.emulatorState$.subscribe(() => {
      void this.emulatorStateChanged()
    })

    // Check for any missing dependencies
    // The language server will start if all dependencies are installed
    // Otherwise, the language server will not start and will start after
    // the user installs the missing dependencies
    this.#dependencyInstaller = new DependencyInstaller()
    this.#dependencyInstaller.missingDependencies.subscribe((deps) => {
      if (deps.length === 0) void this.emulatorCtrl.activate()
      else void this.emulatorCtrl.deactivate()
    })

    // Initialize ExtensionCommands
    this.#commands = new CommandController()
  }

  // Called on exit
  async deactivate (): Promise<void> {
    try {
      await this.emulatorCtrl.deactivate()
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

  async getActiveAccount (): Promise<Account | null> {
    return await this.emulatorCtrl.getActiveAccount()
  }

  async emulatorStateChanged (): Promise<void> {
    // Update UI
    await this.#uiCtrl.emulatorStateChanged()
  }

  async checkDependencies (): Promise<void> {
    await this.#dependencyInstaller.checkDependencies()
  }

  async installMissingDependencies (): Promise<void> {
    await this.#dependencyInstaller.installMissing()
  }

  async executeCommand (command: string): Promise<boolean> {
    return await this.#commands.executeCommand(command)
  }
}
