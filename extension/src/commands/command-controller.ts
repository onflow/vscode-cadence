/* CommandController is responsible for registering possible commands */

import { commands } from 'vscode'
import { ext } from '../main'
import * as commandID from './command-constants'
import { Disposable } from 'vscode-languageclient'
import { Telemetry } from '../telemetry'

export class CommandController {
  cmds: Disposable[] // Hold onto commands

  constructor () {
    this.cmds = []
    this.#registerCommands()
  }

  // Registers a command with VS Code so it can be invoked by the user.
  #registerCommand (command: string, callback: (...args: any[]) => any): void {
    try {
      // DEBUG_LOG('Start Registering command ' + command)

      const cmd: Disposable = commands.registerCommand(command, callback)

      // ext.ctx.subscriptions.push(commands.registerCommand(command, callback))

      this.cmds.push(cmd)

      // ext.ctx.subscriptions.push(cmd)
      // DEBUG_LOG('Registered command ' + command)
    } catch (err) {
      Telemetry.captureException(err)
    }
  }

  // Registers all commands that are handled by the extension (as opposed to
  // those handled by the Language Server).
  #registerCommands (): void {
    this.#registerCommand(commandID.START_EMULATOR, this.#startEmulator)
    this.#registerCommand(commandID.STOP_EMULATOR, this.#stopEmulator)
    this.#registerCommand(commandID.RESTART_SERVER, this.#restartServer)
    this.#registerCommand(commandID.CREATE_ACCOUNT, this.#createAccount)
    this.#registerCommand(commandID.SWITCH_ACCOUNT, this.#switchActiveAccount)
  }

  #restartServer (): void {
    try {
      ext.emulatorCtrl.restartServer()
    } catch (err) {
      Telemetry.captureException(err)
      throw err
    }
  }

  #startEmulator (): void {
    try {
      void ext.emulatorCtrl.startEmulator()
    } catch (err) {
      Telemetry.captureException(err)
      throw err
    }
  }

  #stopEmulator (): void {
    try {
      void ext.emulatorCtrl.stopEmulator()
    } catch (err) {
      Telemetry.captureException(err)
      throw err
    }
  }

  #createAccount (): void {
    try {
      void ext.emulatorCtrl.createNewAccount()
    } catch (err) {
      Telemetry.captureException(err)
      throw err
    }
  }

  #switchActiveAccount (): void {
    try {
      void ext.emulatorCtrl.switchActiveAccount()
    } catch (err) {
      Telemetry.captureException(err)
      throw err
    }
  }
}
