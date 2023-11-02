/* The extension */
import { CommandController } from './commands/command-controller'
import { ExtensionContext } from 'vscode'
import { DependencyInstaller } from './dependency-installer/dependency-installer'
import { Settings } from './settings/settings'
import { JSONSchemaProvider } from './json-schema-provider'
import { flowVersion } from './utils/flow-version'
import { LanguageServerAPI } from './emulator/server/language-server'

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
  languageServer: LanguageServerAPI
  #dependencyInstaller: DependencyInstaller
  #commands: CommandController

  private constructor (settings: Settings, ctx: ExtensionContext | undefined) {
    this.ctx = ctx

    // Register JSON schema provider
    if (ctx != null) JSONSchemaProvider.register(ctx, flowVersion)

    // Initialize Language Server
    this.languageServer = new LanguageServerAPI(settings)
    this.languageServer.activate()

    // Check for any missing dependencies
    // The language server will start if all dependencies are installed
    // Otherwise, the language server will not start and will start after
    // the user installs the missing dependencies
    this.#dependencyInstaller = new DependencyInstaller()

    // Initialize ExtensionCommands
    this.#commands = new CommandController()
  }

  // Called on exit
  async deactivate (): Promise<void> {}

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
