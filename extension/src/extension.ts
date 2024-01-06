import './crypto-polyfill'

import { CommandController } from './commands/command-controller'
import { ExtensionContext } from 'vscode'
import { DependencyInstaller } from './dependency-installer/dependency-installer'
import { Settings } from './settings/settings'
import { JSONSchemaProvider } from './json-schema-provider'
import { flowVersion } from './utils/flow-version'
import { LanguageServerAPI } from './server/language-server'
import { FlowConfig } from './server/flow-config'
import { TestProvider } from './test-provider/test-provider'
import { StorageProvider } from './storage/storage-provider'
import * as path from 'path'
import { Notification, displayNotifications, fetchNotifications, filterNotifications } from './ui/notifications'

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

  private constructor (settings: Settings, ctx: ExtensionContext) {
    this.ctx = ctx

    // Initialize Storage Provider
    const storageProvider = new StorageProvider(ctx?.globalState)

    // Display any notifications from remote server
    flowVersion.getValue().then(flowVersion => {
      if (flowVersion == null) return
      const notificationFilter = (notifications: Notification[]) => filterNotifications(notifications, storageProvider, {
        'vscode-cadence': this.ctx.extension.packageJSON.version ?? '0.0.0',
        'flow-cli': flowVersion.version
      })
      fetchNotifications(notificationFilter).then(notifications => {
        displayNotifications(notifications, storageProvider)
      })
    })

    // Register JSON schema provider
    if (ctx != null) JSONSchemaProvider.register(ctx, flowVersion)

    // Initialize Flow Config
    const flowConfig = new FlowConfig(settings)
    void flowConfig.activate()

    // Initialize Language Server
    this.languageServer = new LanguageServerAPI(settings, flowConfig)

    // Check for any missing dependencies
    // The language server will start if all dependencies are installed
    // Otherwise, the language server will not start and will start after
    // the user installs the missing dependencies
    this.#dependencyInstaller = new DependencyInstaller(this.languageServer)
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
    this.#testProvider?.dispose()
  }
}
