import { Terminal, window } from 'vscode'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { Settings } from '../../settings/settings'
import * as Config from '../local/config'

// Name of all Flow files stored on-disk.
const FLOW_CONFIG_FILENAME = 'flow.json'
const FLOW_DB_FILENAME = 'flowdb'

export class TerminalController {
  storagePath: string | undefined
  flowCommand: string
  #terminal: Terminal | null

  constructor (ctxStoragePath: string | undefined, ctxGlobalStoragePath: string) {
    this.flowCommand = Settings.getWorkspaceSettings().flowCommand
    this.storagePath = this.getStoragePath(ctxStoragePath, ctxGlobalStoragePath)
    this.#terminal = this.#initTerminal()
  }

  // Returns a path to a directory that can be used for persistent storage.
  // Creates the directory if it doesn't already exist.
  getStoragePath (ctxStoragePath: string | undefined, ctxGlobalStoragePath: string): string | undefined {
    const path: string = (ctxStoragePath !== undefined ? ctxStoragePath : ctxGlobalStoragePath)
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

  #initTerminal (): Terminal {
    this.resetTerminal()
    if (this.#terminal != null) {
      return this.#terminal
    }
    throw (Error('Terminal could not be initialized'))
  }

  resetTerminal (): void {
    if (this.storagePath === undefined) {
      throw new Error('Missing extension storage path')
    }

    if (this.#terminal != null) {
      this.#terminal.dispose()
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

  async startEmulator (): Promise<void> {
    if (this.#terminal == null) {
      throw (Error('Terminal not initialized'))
    }
    this.#terminal.sendText(
      [
        this.flowCommand,
        'emulator',
          `--config-path="${await Config.getConfigPath()}"`,
          '--verbose'
      ].join(' ')
    )
    this.#terminal.show()
    // TODO: Can we check the return code of our send text?? Would allow us to catch errors here!
  }
}
