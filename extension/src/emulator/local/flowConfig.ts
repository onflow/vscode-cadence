/* Handle flow.json config file */
import { window, workspace, commands } from 'vscode'
import * as util from 'util'
import * as cp from 'child_process'
import { FILE_PATH_EMPTY } from '../../utils/utils'
import { Settings } from '../../settings/settings'
import * as fs from 'fs'
import { StateCache } from '../../utils/state-cache'

const exec = util.promisify(cp.exec)

// Path to flow.json file
let configPath: string | undefined
export const flowConfig: StateCache<FlowConfig> = new StateCache(fetchConfig)

export const EMULATOR_ACCOUNT = 'emulator-account'

export function setConfigPath (path: string): void {
  configPath = path
}

export interface FlowConfig {
  emulators: {
    [name: string]: {
      port: string
      serviceAccount: string
    }
  }
  contracts: {
    [name: string]: string
  }
  networks: {
    [name: string]: string
  }
  accounts: {
    [name: string]: {
      address: string
      key: string
    }
  }
  deployments: {
    [network: string]: {
      [account: string]: [string]
    }
  }
}

// Call this function to get the path to flow.json
export async function getConfigPath (): Promise<string> {
  if (configPath === undefined) {
    configPath = await retrieveConfigPath()
    handleConfigChanges()
  }
  return configPath
}

export async function fetchConfig (filepath?: string): Promise<FlowConfig> {
  const flowJsonPath = filepath ?? await getConfigPath()
  return JSON.parse(fs.readFileSync(flowJsonPath, 'utf-8'))
}

export async function getAccountKey (accountName: string, filepath?: string): Promise<string | undefined> {
  const fc = (filepath == null) ? await flowConfig.getValue() : await fetchConfig(filepath)

  let emulatorKey: string | undefined
  try {
    emulatorKey = fc.accounts[accountName].key
  } catch (err) {
    console.log(`Missing key for ${accountName} in ${configPath as string}`)
  }

  return emulatorKey
}

async function retrieveConfigPath (): Promise<string> {
  // Try to search for config file
  let configPath = await readLocalConfig()
  if (configPath === FILE_PATH_EMPTY) {
    // Couldn't find config file, prompt user
    if (!await promptInitializeConfig()) { throw Error('No valid config path') }
    configPath = await readLocalConfig()
  }
  return configPath
}

// Prompt the user to create a new config file
async function promptInitializeConfig (): Promise<boolean> {
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

// Search for config file in workspace
async function readLocalConfig (): Promise<string> {
  const settings = Settings.getWorkspaceSettings()
  let configFilePath: string

  if (settings.customConfigPath !== '') {
    // Check custom flow.json path
    const file = settings.customConfigPath
    if (!fs.existsSync(file)) {
      throw new Error('Can\'t access custom flow.json file: ' + file)
    }
    configFilePath = file
  } else {
    // Default config search for flow.json in workspace
    const file = await workspace.findFiles('flow.json')
    if (file.length !== 1) {
      return FILE_PATH_EMPTY
    }
    configFilePath = file[0].fsPath
  }

  return configFilePath
}

export async function watchFlowConfigChanges (changedEvent: () => {}): Promise<void> {
  const path = await getConfigPath()
  const configWatcher = workspace.createFileSystemWatcher(path)

  let updateDelay: any = null
  configWatcher.onDidChange(e => {
    // request deduplication - we do this to avoid spamming requests in a short time period but rather aggragete into one
    if (updateDelay == null) {
      updateDelay = setTimeout(() => {
        changedEvent()
        updateDelay = null
      }, 500)
    }
  })
}

// Called when configuration is changed
function handleConfigChanges (): void {
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
