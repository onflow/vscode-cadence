/* Handle flow.json config file */
import { window, workspace, commands, Uri } from 'vscode'
import { FILE_PATH_EMPTY } from '../../utils/utils'
import { Settings } from '../../settings/settings'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { StateCache } from '../../utils/state-cache'
import { Disposable } from 'vscode-languageclient'
import { tryExecDefault } from '../../utils/shell/exec'

// Explicitly set path to flow.json file (for testing)
let configPath: string | undefined
export const flowConfig: StateCache<FlowConfig> = new StateCache(fetchConfig)

export const EMULATOR_ACCOUNT = 'emulator-account'

export function setConfigPath (path: string): void {
  configPath = path
  flowConfig.invalidate()
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
  const resolvedConfigPath = configPath ?? await retrieveConfigPath()
  handleConfigChanges()
  return resolvedConfigPath
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
  const configPath = await readLocalConfig()
  if (configPath === FILE_PATH_EMPTY) {
    // Couldn't find config file, prompt user
    void promptInitializeConfig()
    throw new Error('Config file not found')
  }
  return configPath
}

// Prompt the user to create a new config file
async function promptInitializeConfig (): Promise<void> {
  const rootPath = workspace.workspaceFolders?.[0]?.uri?.fsPath

  if (rootPath == null) {
    void window.showErrorMessage('No workspace folder found. Please open a workspace folder and try again.')
  }

  const continueMessage = 'Continue'
  const selection = await window.showInformationMessage(
    'Missing Flow CLI configuration. Create a new one?',
    continueMessage
  )
  if (selection !== continueMessage) {
    return
  }

  const didInit = await tryExecDefault('flow init', { cwd: rootPath })

  if (!didInit) {
    void window.showErrorMessage('Failed to initialize Flow CLI configuration.')
  } else {
    void window.showInformationMessage('Flow CLI configuration created.')
    flowConfig.invalidate()
  }
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
        const files = workspace.workspaceFolders.reduce<string[]>(
          (res, folder) => ([...res, path.resolve(folder.uri.fsPath, settings.customConfigPath)]),
          []
        )
        if (files.length === 1) {
          configFilePath = files[0]
        } else if (files.length === 0) {
          void window.showErrorMessage(`File specified at ${settings.customConfigPath} not found.  Please verify the file exists.`)
          throw new Error('File not found')
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
    const files = (await workspace.findFiles('flow.json')).map(f => f.fsPath)
    if (files.length === 0) {
      return FILE_PATH_EMPTY
    } else if (files.length > 1) {
      void window.showErrorMessage(`Multiple flow.json files found: ${files.join(', ')}.  Please specify an absolute path to the desired flow.json file in your workspace settings.`)
      throw new Error('Multiple flow.json files found')
    }
    configFilePath = files[0]
  }

  return configFilePath
}

export async function watchFlowConfigChanges (changedEvent: () => {}): Promise<Disposable> {
  const watchPath = await getConfigPath().catch(() => "**/flow.json")
  const configWatcher = workspace.createFileSystemWatcher(watchPath)

  let updateDelay: any = null
  function watcherHandler(e: Uri) {
    // request deduplication - we do this to avoid spamming requests in a short time period but rather aggragete into one
    if (updateDelay == null) {
      updateDelay = setTimeout(() => {
        flowConfig.invalidate()
        changedEvent()
        updateDelay = null
      }, 500)
    }
  }

  configWatcher.onDidChange(watcherHandler)
  configWatcher.onDidCreate(watcherHandler)
  configWatcher.onDidDelete(watcherHandler)

  return configWatcher
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
