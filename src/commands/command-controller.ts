/* CommandController is responsible for registering possible commands */

import {
  commands,
} from 'vscode'

import { ext } from '../extension'
import { commandID } from './command-constants'
import { DEBUG_LOG } from '../utils/debug'
import { Disposable } from 'vscode-languageclient'


export class CommandController {
  
  cmds: Disposable[]  // Hold onto commands

  constructor() {
    DEBUG_LOG("Extension commands ctor")
    this.registerCommands()
    this.cmds = []
  }

  // Registers a command with VS Code so it can be invoked by the user.
  #registerCommand (command: string, callback: (...args: any[]) => any) {
    DEBUG_LOG('Try Registering command ' + command)
    let cmd: Disposable = commands.registerCommand(command, callback)
    // TODO: Why can't I subscribe my commands?? Things are undefined for some reason?!?
    //commands.registerCommand(command, callback)
    //ext.ctx.subscriptions.push(commands.registerCommand(command, callback))
    //this.cmds.push(cmd)
    ext.ctx.subscriptions.push(cmd)
    DEBUG_LOG('Registered command ' + command)
  }
  

  // Registers all commands that are handled by the extension (as opposed to
  // those handled by the Language Server).
  registerCommands () {
    DEBUG_LOG("Start Register Commands")
    this.#registerCommand(commandID.START_EMULATOR, () => {this.#startEmulator()})
    this.#registerCommand(commandID.STOP_EMULATOR, () => {this.#stopEmulator()})
    this.#registerCommand(commandID.RESTART_SERVER, () => {this.#restartServer()})
    this.#registerCommand(commandID.CREATE_ACCOUNT, () => {this.#createAccount()})
    this.#registerCommand(commandID.SWITCH_ACCOUNT, () => {this.#switchActiveAccount()})
    DEBUG_LOG('Register Commands Done')
  }

  async #restartServer() {
    ext.emulatorCtrl.restartServer()
  }

  async #startEmulator() {
    ext.emulatorCtrl.startEmulator()
  }

  async #stopEmulator() {
    ext.emulatorCtrl.stopEmulator()
  }

  async #createAccount() {
    ext.emulatorCtrl.createNewAccount()
  }

  async #switchActiveAccount() {
    ext.emulatorCtrl.switchActiveAccount()
  }
}
