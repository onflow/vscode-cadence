/* CommandController is responsible for registering possible commands */
import { commands } from 'vscode'
import { ext } from '../main'
import * as commandID from './command-constants'
import { Disposable } from 'vscode-languageclient'
import * as Telemetry from '../telemetry/telemetry'

export class CommandController {
  #cmds: Disposable[] // Hold onto commands

  constructor () {
    this.#cmds = []
    Telemetry.withTelemetry(this.#registerCommands.bind(this))
  }

  // Registers a command with VS Code so it can be invoked by the user.
  #registerCommand (command: string, callback: (...args: any[]) => any): void {
    const commandCallback = (): void => { Telemetry.withTelemetry(callback.bind(this)) }
    const cmd: Disposable = commands.registerCommand(command, commandCallback)
    this.#cmds.push(cmd)
  }

  // Registers all commands that are handled by the extension (as opposed to
  // those handled by the Language Server).
  #registerCommands (): void {
    this.#registerCommand(commandID.RESTART_SERVER, this.#restartServer)
    this.#registerCommand(commandID.CREATE_ACCOUNT, this.#createAccount)
    this.#registerCommand(commandID.SWITCH_ACCOUNT, this.#switchActiveAccount)
    this.#registerCommand(commandID.CHECK_DEPENDENCIES, this.#checkDependencies)
    this.#registerCommand(commandID.COPY_ACTIVE_ACCOUNT, this.#copyActiveAccount)
  }

  #restartServer (): void {
    ext.emulatorCtrl.restartServer()
  }

  #createAccount (): void {
    void ext.emulatorCtrl.createNewAccount()
  }

  #switchActiveAccount (): void {
    void ext.emulatorCtrl.switchActiveAccount()
  }

  #copyActiveAccount (): void {
    void ext.emulatorCtrl.copyActiveAccount()
  }

  #checkDependencies (): void {
    void ext.checkDependencies()
  }
}
