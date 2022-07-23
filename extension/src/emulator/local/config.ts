/* Handle flow.json config file */
import { window, workspace, commands } from 'vscode'
import * as util from 'util'
import * as cp from 'child_process'
import { FILE_PATH_EMPTY } from '../../utils/utils'
import { Settings } from '../../settings/settings'
import * as fs from 'fs'

const exec = util.promisify(cp.exec)

// Path to flow.json file
let configPath: string | undefined

// Call this function to get the path to flow.json
export async function getConfigPath (): Promise<string> {
  if (configPath === undefined) {
    configPath = await retrieveConfigPath()
    handleConfigChanges()
  }
  return configPath
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
