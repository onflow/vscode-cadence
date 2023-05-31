/* Handle flow.json config file */
import { window, workspace, commands } from 'vscode'
import * as util from 'util'
import * as cp from 'child_process'
import { FILE_PATH_EMPTY } from '../../utils/utils'
import { Settings } from '../../settings/settings'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { StateCache } from '../../utils/state-cache'
import { Disposable } from 'vscode-languageclient'

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
    if (!(await promptInitializeConfig())) {
      throw Error('No valid config path')
    }
    configPath = await readLocalConfig()
  }
  return configPath
}

// Prompt the user to create a new config file
async function promptInitializeConfig (): Promise<boolean> {
  let rootPath: string | undefined
  if (
    workspace.workspaceFolders != null &&
    workspace.workspaceFolders.length > 0
  ) {
    rootPath = workspace.workspaceFolders[0].uri.fsPath
  } else {
    rootPath = workspace.rootPath // ref: deprecated
  }
  if (rootPath === undefined) {
    return false
  }

  const continueMessage = 'Continue'
  const selection = await window.showInformationMessage(
    'Missing Flow CLI configuration. Create a new one?',
    continueMessage
  )
  if (selection !== continueMessage) {
    return false
  }

  await exec('flow init', { cwd: rootPath })

  return true
}

// Search for config file in workspace
async function readLocalConfig (): Promise<string> {
  const settings = Settings.getWorkspaceSettings()
  let configFilePath: string | undefined

  if (settings.customConfigPath !== '') {
    if (settings.customConfigPath[0] === '~') {
      configFilePath = path.join(
        os.homedir(),
        settings.customConfigPath.slice(1)
      )
    } else if (workspace.workspaceFolders != null) {
      if (path.isAbsolute(settings.customConfigPath)) {
        configFilePath = settings.customConfigPath
      } else {
        const files = workspace.workspaceFolders.reduce(
          (res, folder) => ([...res, path.resolve(folder.uri.fsPath, settings.customConfigPath)]),
          [] as string[],
        )
        if(files.length === 1) {
          configFilePath = files[0]
        } else {
          void window.showErrorMessage(`Multiple flow.json files found: ${files.join(', ')}.  Please specify an absolute path to the desired flow.json file in your workspace settings.`)
          throw new Error('Multiple flow.json files found')
        }
      }
    }

    if (configFilePath === undefined || !fs.existsSync(configFilePath)) {
      throw new Error(
        "Can't access custom flow.json file: " + settings.customConfigPath
      )
    }
  } else {
    // Default config search for flow.json in workspace
    const file = await workspace.findFiles('flow.json')
    if (file.length === 0) {
      return FILE_PATH_EMPTY
    } else if(file.length > 1) {
      void window.showErrorMessage(`Multiple flow.json files found: ${file.join(', ')}.  Please specify an absolute path to the desired flow.json file in your workspace settings.`)
      throw new Error('Multiple flow.json files found')
    }
    configFilePath = file[0].fsPath
  }

  return configFilePath
}

export async function watchFlowConfigChanges (changedEvent: () => {}): Promise<Disposable> {
  const path = await getConfigPath()
  const configWatcher = workspace.createFileSystemWatcher(path)

  let updateDelay: any = null
  return configWatcher.onDidChange(e => {
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
