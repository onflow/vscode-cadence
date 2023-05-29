/* CommandController is responsible for registering possible commands */
import { commands, Disposable } from 'vscode'
import { ext } from '../main'
import * as commandID from './command-constants'
import * as Telemetry from '../telemetry/telemetry'

export class CommandController {
  #cmds: Disposable[] // Hold onto commands
  #mappings = new Map<string, () => void | Promise<void>>()

  constructor () {
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
    this.#registerCommand(commandID.CREATE_ACCOUNT, this.#createAccount.bind(this))
    this.#registerCommand(commandID.SWITCH_ACCOUNT, this.#switchActiveAccount.bind(this))
    this.#registerCommand(commandID.CHECK_DEPENDENCIES, this.#checkDependencies.bind(this))
    this.#registerCommand(commandID.COPY_ACTIVE_ACCOUNT, this.#copyActiveAccount.bind(this))
  }

  async #restartServer (): Promise<void> {
    await ext?.emulatorCtrl.restartServer()
  }

  async #createAccount (): Promise<void> {
    await ext?.emulatorCtrl.createNewAccount()
  }

  async #switchActiveAccount (): Promise<void> {
    await ext?.emulatorCtrl.switchActiveAccount()
  }

  async #copyActiveAccount (): Promise<void> {
    await ext?.emulatorCtrl.copyActiveAccount()
  }

  #checkDependencies (): void {
    ext?.checkDependencies()
  }
}
