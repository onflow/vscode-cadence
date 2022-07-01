/* TODO: Make local data deal with account data, and configs.ts just deal with the initial configs that
         everything else needs like flowCommand, accessCheckMode, etc? */
import { commands, window, workspace } from 'vscode'
import { Account } from '../account'
import * as util from 'util'
import * as cp from 'child_process'
import { DEBUG_LOG } from '../../utils/debug'
const exec = util.promisify(cp.exec)

const CONFIG_FLOW_COMMAND = 'flowCommand'
const CONFIG_NUM_ACCOUNTS = 'numAccounts'
const CONFIG_ACCESS_CHECK_MODE = 'accessCheckMode'

// The configuration used by the extension.
export class Config {
  // The name of the Flow CLI executable.
  flowCommand!: string
  numAccounts!: number
  // Set of created accounts for which we can submit transactions.
  // Mapping from account address to account object.
  accounts: Account[]
  // Index of the currently active account.
  activeAccount: number | null
  accessCheckMode!: string

  // Full path to flow.json file
  configPath: string

  constructor () {
    this.accounts = []
    this.activeAccount = null
    this.configPath = ''

    // Read configuration file
    try {
      [this.flowCommand, this.numAccounts, this.accessCheckMode] = this.#getConfig()
      if (!this.#readLocalConfig()) { // TODO: Why is this failing to continue and keep the set configPath?
        if (!this.#promptInitializeConfig()) { return }
        this.#readLocalConfig()
      }
      DEBUG_LOG("ConfigPath configured: " + this.configPath)
    } catch (err) {
      window.showErrorMessage(`Failed to activate extension: ${String(err)}`)
        .then(() => {}, () => {})
      return
    }
    this.#handleConfigChanges()
  }

  async #promptInitializeConfig (): Promise<boolean> {
    let rootPath: string | undefined
    if ((workspace.workspaceFolders != null) && (workspace.workspaceFolders.length > 0)) {
      rootPath = workspace.workspaceFolders[0].uri.fsPath
    } else {
      rootPath = workspace.rootPath // ref: deprecated
    }
    if (rootPath === undefined) {
      return false
    }
  
    const continueMessage = 'Continue'
    const selection = await window.showInformationMessage('Missing Flow CLI configuration. Create a new one?', continueMessage)
    if (selection !== continueMessage) {
      return false
    }
  
    await exec('flow init', { cwd: rootPath })

    return true
  }

  async #readLocalConfig () {
    const file = await workspace.findFiles('flow.json')
    if (file.length !== 1) {
      return false
    }
    const configFile = file[0]
    this.configPath = configFile.path
    DEBUG_LOG("ConfigPath in read local after set: " + this.configPath)
    return true
  }

  // Retrieves config from the workspace.
  #getConfig (): [string, number, string] {
    const cadenceConfig = workspace.getConfiguration('cadence')
  
    const flowCommand: string | undefined = cadenceConfig.get(
      CONFIG_FLOW_COMMAND
    )
    if (flowCommand === undefined) {
      throw new Error(`Missing ${CONFIG_FLOW_COMMAND} config`)
    }
  
    const numAccounts: number | undefined = cadenceConfig.get(
      CONFIG_NUM_ACCOUNTS
    )
    if (numAccounts === undefined) {
      throw new Error(`Missing ${CONFIG_NUM_ACCOUNTS} config`)
    }
  
    let accessCheckMode: string | undefined = cadenceConfig.get(
      CONFIG_ACCESS_CHECK_MODE
    )
    if (accessCheckMode === undefined) {
      accessCheckMode = 'strict'
    }
  
    return [flowCommand, numAccounts, accessCheckMode]
  }

  // Adds an event handler that prompts the user to reload whenever the config
  // changes.
  #handleConfigChanges (): void {
    workspace.onDidChangeConfiguration((e) => {
      // TODO: do something smarter for account/emulator config (re-send to server)
      const promptRestartKeys = [
        'languageServerPath',
        'accountKey',
        'accountAddress',
        'emulatorAddress'
      ]
      const shouldPromptRestart = promptRestartKeys.some((key) =>
        e.affectsConfiguration(`cadence.${key}`)
      )
      if (shouldPromptRestart) {
        window
          .showInformationMessage(
            'Server launch configuration change detected. Reload the window for changes to take effect',
            'Reload Window',
            'Not now'
          )
          .then((choice) => {
            if (choice === 'Reload Window') {
              commands.executeCommand('workbench.action.reloadWindow')
                .then(() => {}, () => {})
            }
          }, () => {})
      }
    })
  }

  /* Public interface */

  addAccount (account: Account): void {
    const index = this.accounts.length
    account.setIndex(index)
    this.accounts.push(account)
  }

  setActiveAccount (index: number): void {
    this.activeAccount = index
  }

  getActiveAccount (): Account | null {
    if (this.activeAccount == null) {
      return null
    }

    return this.accounts[this.activeAccount]
  }

  getAccount (index: number): Account | null {
    if (index < 0 || index >= this.accounts.length) {
      return null
    }

    return this.accounts[index]
  }

  accountExists (name: string): boolean {
    return this.accounts.filter(acc => {
      return acc.name === name
    }).length > 0
  }

  // Resets account state
  resetAccounts (): void {
    this.accounts = []
    this.activeAccount = -1
  }
}
