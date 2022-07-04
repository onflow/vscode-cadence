/* CommandController is responsible for registering possible commands */

import {
  commands,
} from 'vscode'

import { ext } from '../main'
import { commandID } from './command-constants'
import { DEBUG_LOG } from '../utils/debug'
import { Disposable } from 'vscode-languageclient'


export class CommandController {
  
  cmds: Disposable[]  // Hold onto commands

  constructor() {
    this.cmds = []
    this.#registerCommands()
  }

  // Registers a command with VS Code so it can be invoked by the user.
  #registerCommand (command: string, callback: (...args: any[]) => any) {
    // TODO: Do I need to subscribe the cmds?
    //DEBUG_LOG('Start Registering command ' + command)

    let cmd: Disposable = commands.registerCommand(command, callback)

    //ext.ctx.subscriptions.push(commands.registerCommand(command, callback))

    this.cmds.push(cmd)

    //ext.ctx.subscriptions.push(cmd)
    //DEBUG_LOG('Registered command ' + command)
  }
  
  // Registers all commands that are handled by the extension (as opposed to
  // those handled by the Language Server).
  #registerCommands () {
    DEBUG_LOG("Start Register Commands")
    this.#registerCommand(commandID.START_EMULATOR, () => {this.#startEmulator()})
    this.#registerCommand(commandID.STOP_EMULATOR, () => {this.#stopEmulator()})
    this.#registerCommand(commandID.RESTART_SERVER, () => {this.#restartServer()})
    this.#registerCommand(commandID.CREATE_ACCOUNT, () => {this.#createAccount()})
    this.#registerCommand(commandID.SWITCH_ACCOUNT, () => {this.#switchActiveAccount()})
    DEBUG_LOG('Register Commands Done')
  }

  #restartServer() {
    ext.emulatorCtrl.restartServer()
  }

  #startEmulator() {
    ext.emulatorCtrl.startEmulator()
  }

  #stopEmulator() {
    ext.emulatorCtrl.stopEmulator()
  }

  #createAccount() {
    ext.emulatorCtrl.createNewAccount()
  }

  #switchActiveAccount() {
    ext.emulatorCtrl.switchActiveAccount()
  }
}
