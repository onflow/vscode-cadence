import { commands, window, workspace } from 'vscode'
import fs from 'fs';
import { Account } from './account'

const CONFIG_FLOW_COMMAND = 'flowCommand'
const CONFIG_CUSTOM_CONFIG_PATH = 'customConfigPath'
const CONFIG_ENABLE_CUSTOM_CONFIG_PATH = 'enableCustomConfigPath'
const CONFIG_NUM_ACCOUNTS = 'numAccounts'
const CONFIG_ACCESS_CHECK_MODE = 'accessCheckMode'

// The configuration used by the extension.
export class Config {
  // The name of the Flow CLI executable.
  flowCommand: string
  // Custom path to flow.json
  customConfigPath: string

  enableCustomConfigPath: boolean

  numAccounts: number
  // Set of created accounts for which we can submit transactions.
  // Mapping from account address to account object.
  accounts: Account[]
  // Index of the currently active account.
  activeAccount: number | null
  accessCheckMode: string

  // Full path to flow.json file
  configPath: string

  constructor (
    flowCommand: string,
    customConfigPath: string,
    enableCustomConfigPath: boolean,
    numAccounts: number,
    accessCheckMode: string
  ) {
    this.flowCommand = flowCommand
    this.customConfigPath = customConfigPath
    this.enableCustomConfigPath = enableCustomConfigPath
    this.numAccounts = numAccounts
    this.accessCheckMode = accessCheckMode
    this.accounts = []
    this.activeAccount = null
    this.configPath = ''
  }

  async readCustomConfig (): Promise<boolean> {
    if (fs.existsSync(this.customConfigPath)) {
      this.configPath = this.customConfigPath
      return true
    }
    return false
  }

  async readLocalConfig (): Promise<boolean> {
    const file = await workspace.findFiles('flow.json')
    if (file.length !== 1) {
      return false
    }
    const configFile = file[0]
    this.configPath = configFile.path
    return true
  }

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

// Retrieves config from the workspace.
export function getConfig (): Config {
  const cadenceConfig = workspace.getConfiguration('cadence')

  const flowCommand: string | undefined = cadenceConfig.get(
    CONFIG_FLOW_COMMAND
  )
  if (flowCommand === undefined) {
    throw new Error(`Missing ${CONFIG_FLOW_COMMAND} config`)
  }

  const customConfigPath: string | undefined = cadenceConfig.get(
    CONFIG_CUSTOM_CONFIG_PATH
  )
  if (customConfigPath === undefined) {
    throw new Error(`Missing ${CONFIG_CUSTOM_CONFIG_PATH} config`)
  }

  const enableCustomConfigPath: boolean | undefined = cadenceConfig.get(
    CONFIG_ENABLE_CUSTOM_CONFIG_PATH
  )
  if (enableCustomConfigPath === undefined) {
    throw new Error(`Missing ${CONFIG_ENABLE_CUSTOM_CONFIG_PATH} config`)
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

  return new Config(flowCommand, customConfigPath, enableCustomConfigPath, numAccounts, accessCheckMode)
}

// Adds an event handler that prompts the user to reload whenever the config
// changes.
export function handleConfigChanges (): void {
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
