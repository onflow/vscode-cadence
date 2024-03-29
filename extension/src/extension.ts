import './crypto-polyfill'

import { CommandController } from './commands/command-controller'
import { ExtensionContext } from 'vscode'
import { DependencyInstaller } from './dependency-installer/dependency-installer'
import { Settings } from './settings/settings'
import { CliProvider } from './flow-cli/cli-provider'
import { JSONSchemaProvider } from './json-schema-provider'
import { LanguageServerAPI } from './server/language-server'
import { FlowConfig } from './server/flow-config'
import { TestProvider } from './test-provider/test-provider'
import { StorageProvider } from './storage/storage-provider'
import * as path from 'path'
import { NotificationProvider } from './ui/notification-provider'
import { CliSelectionProvider } from './flow-cli/cli-selection-provider'

// The container for all data relevant to the extension.
export class Extension {
  // The extension singleton
  static #instance: Extension
  static initialized = false

  static initialize (settings: Settings, ctx: ExtensionContext): Extension {
    Extension.#instance = new Extension(settings, ctx)
    Extension.initialized = true
    return Extension.#instance
  }

  ctx: ExtensionContext
  languageServer: LanguageServerAPI
  #dependencyInstaller: DependencyInstaller
  #commands: CommandController
  #testProvider: TestProvider
  #schemaProvider: JSONSchemaProvider
  #cliSelectionProvider: CliSelectionProvider

  private constructor (settings: Settings, ctx: ExtensionContext) {
    this.ctx = ctx

    // Initialize Storage Provider
    const storageProvider = new StorageProvider(ctx?.globalState)

    // Display any notifications from remote server
    const notificationProvider = new NotificationProvider(storageProvider)
    notificationProvider.activate()

    // Register CliProvider
    const cliProvider = new CliProvider(settings)

    // Register CliSelectionProvider
    this.#cliSelectionProvider = new CliSelectionProvider(cliProvider)

    // Register JSON schema provider
    this.#schemaProvider = new JSONSchemaProvider(ctx.extensionPath, cliProvider)

    // Initialize Flow Config
    const flowConfig = new FlowConfig(settings)
    void flowConfig.activate()

    // Initialize Language Server
    this.languageServer = new LanguageServerAPI(settings, cliProvider, flowConfig)

    // Check for any missing dependencies
    // The language server will start if all dependencies are installed
    // Otherwise, the language server will not start and will start after
    // the user installs the missing dependencies
    this.#dependencyInstaller = new DependencyInstaller(this.languageServer, cliProvider)
    this.#dependencyInstaller.missingDependencies.subscribe((missing) => {
      if (missing.length === 0) {
        void this.languageServer.activate()
      } else {
        void this.languageServer.deactivate()
      }
    })

    // Initialize ExtensionCommands
    this.#commands = new CommandController(this.#dependencyInstaller)

    // Initialize TestProvider
    const extensionPath = ctx.extensionPath ?? ''
    const parserLocation = path.resolve(extensionPath, 'out/extension/cadence-parser.wasm')
    this.#testProvider = new TestProvider(parserLocation, settings, flowConfig)
  }

  // Called on exit
  async deactivate (): Promise<void> {
    await this.languageServer.deactivate()
    this.#testProvider.dispose()
    this.#schemaProvider.dispose()
    this.#cliSelectionProvider.dispose()
  }
}
