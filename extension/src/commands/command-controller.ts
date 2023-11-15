/* CommandController is responsible for registering possible commands */
import { commands, Disposable, window } from 'vscode'
import { ext } from '../main'
import * as commandID from './command-constants'
import * as Telemetry from '../telemetry/telemetry'
import { DependencyInstaller } from '../dependency-installer/dependency-installer'

export class CommandController {
  #cmds: Disposable[] // Hold onto commands
  #mappings = new Map<string, () => void | Promise<void>>()

  #dependencyInstaller: DependencyInstaller

  constructor (dependencyInstaller: DependencyInstaller) {
    this.#dependencyInstaller = dependencyInstaller
    this.#cmds = []
    Telemetry.withTelemetry(this.#registerCommands.bind(this))
  }

  async executeCommand (command: string): Promise<boolean> {
    const cmd = this.#mappings.get(command)
    if (cmd !== undefined) {
      await cmd()
      return true
    }
    return false
  }

  // Registers a command with VS Code so it can be invoked by the user.
  #registerCommand (command: string, callback: () => void | Promise<void>): void {
    const commandCallback = (): void | Promise<void> => Telemetry.withTelemetry(callback)
    const cmd = commands.registerCommand(command, commandCallback)
    this.#cmds.push(cmd)
    this.#mappings.set(command, commandCallback)
  }

  // Registers all commands that are handled by the extension (as opposed to
  // those handled by the Language Server).
  #registerCommands (): void {
    this.#registerCommand(commandID.RESTART_SERVER, this.#restartServer.bind(this))
    this.#registerCommand(commandID.CHECK_DEPENDENCIES, this.#checkDependencies.bind(this))
  }

  async #restartServer (): Promise<void> {
    await ext?.languageServer.restart()
  }

  async #checkDependencies (): Promise<void> {
    await this.#dependencyInstaller.checkDependencies()

    // Show message if all dependencies are already installed
    const missingDependencies = await this.#dependencyInstaller.missingDependencies.getValue()
    if (missingDependencies.length === 0) {
      void window.showInformationMessage('All dependencies are already installed')
    }
  }
}
