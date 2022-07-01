import { Terminal, window } from 'vscode'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { ext } from '../../extension'
import { flow } from 'cypress/types/lodash'

// Name of all Flow files stored on-disk.
const FLOW_CONFIG_FILENAME = 'flow.json'
const FLOW_DB_FILENAME = 'flowdb'

export class TerminalController {

  storagePath: string | undefined
  flowCommand: string
  configPath: string
  #terminal: Terminal

  constructor (
    flowCommand: string,
    configPath: string,
    ctx_storagePath: string | undefined, 
    ctx_globalStoragePath: string
    ) {
    this.flowCommand = flowCommand
    this.configPath = configPath
    this.storagePath = this.getStoragePath(ctx_storagePath, ctx_globalStoragePath)
    this.#terminal = this.#initTerminal()
  }

  // Returns a path to a directory that can be used for persistent storage.
  // Creates the directory if it doesn't already exist.
  getStoragePath (ctx_storagePath: string | undefined, ctx_globalStoragePath: string) {
    let path: string
    path = (ctx_storagePath !== undefined ? ctx_storagePath : ctx_globalStoragePath)
    console.log('Storage path: ', path)
    if (!existsSync(path)) {
      try {
        mkdirSync(path)
      } catch (err) {
        console.log('Error creating storage path: ', err)
        return
      }
    }
    return path
  }

  #initTerminal(): Terminal {
    this.newTerminal()
    return this.#terminal
  }
  
  newTerminal() {
    this.#terminal.dispose()
  
    if (this.storagePath === undefined) {
      throw new Error('Missing extension storage path')
    }
  
    // By default, reset all files on each load.
    this.resetStorage()
  
    // Set new terminal
    this.#terminal = window.createTerminal({
      name: 'Flow Emulator',
      hideFromUser: true,
      cwd: this.storagePath
    })
  }

  // Deletes all Flow files from extension storage.
  // TODO: This doesn't work right now due to permissions issue
  // REF: https://github.com/dapperlabs/flow-go/issues/1726
  resetStorage (): void {
    if (this.storagePath === undefined) {
      return
    }

    try {
      unlinkSync(join(this.storagePath, FLOW_CONFIG_FILENAME))
      unlinkSync(join(this.storagePath, FLOW_DB_FILENAME))
    } catch (err) {
      if (err.code === 'ENOENT') {
        return
      }
      console.error('Error resetting storage: ', err)
    }
  }

  startEmulator() {
    this.#terminal.sendText(
      [
          this.flowCommand,
          'emulator',
          `--config-path="${this.configPath}"`,
          '--verbose'
      ].join(' ')
      )
      this.#terminal.show()
  }

}
