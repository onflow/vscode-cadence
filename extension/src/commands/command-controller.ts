/* CommandController is responsible for registering possible commands */
import { commands } from 'vscode'
import { ext } from '../main'
import * as commandID from './command-constants'
import { Disposable } from 'vscode-languageclient'
import * as Telemetry from '../telemetry/telemetry'
import { execDefault } from '../utils/utils'

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
    // Flow emulator commands
    this.#registerCommand(commandID.RESTART_SERVER, this.#restartServer)
    this.#registerCommand(commandID.CREATE_ACCOUNT, this.#createAccount)
    this.#registerCommand(commandID.SWITCH_ACCOUNT, this.#switchActiveAccount)
    this.#registerCommand(commandID.COPY_ACTIVE_ACCOUNT, this.#copyActiveAccount)

    // Extension dependencies
    this.#registerCommand(commandID.CHECK_DEPENDENCIES, this.#checkDependencies)

    // Flow CLI super commands
    this.#registerCommand(commandID.FLOW_SETUP, this.#flowSetup)
    this.#registerCommand(commandID.FLOW_DEV, this.#flowDev)
    this.#registerCommand(commandID.FLOW_EXEC, this.#flowExec)
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

  #flowSetup (): void {
    // TODO: Does this need to be run before the emulator is started?
    // TODO: Run flow setup in a shell? Needs to run in the right directory
    execDefault("flow setup")
  }

  #flowDev (): void {
    
  }

  #flowExec (): void {
    
  }
}
