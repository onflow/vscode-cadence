/* CommandController is responsible for registering possible commands */
import { commands } from 'vscode'
import { ext } from '../main'
import * as commandID from './command-constants'
import { Disposable } from 'vscode-languageclient'
import * as Telemetry from '../telemetry/telemetry'
import { execDefault } from '../utils/utils'
import { window } from 'vscode'

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

    // Flow CLI commands
    this.#registerCommand(commandID.FLOW_DEV, this.#flowDev)
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

  #flowDev (): void {
    // TODO: Instead of showing the terminal, hide it and have an icon indicating if
    // flow dev is active or insactive, which you can click on to activate or deactivate.
    // Also, when flow dev updates the emulator we want to see a popup saying showing 
    // what was updated. For now it could be fine to just open a terminal in vscode and
    // run flow dev there.
    let term = window.createTerminal({
      name: 'Flow Dev',
      hideFromUser: true,
    })

    term.sendText("flow dev")
    term.show()
  }
}
