/* TODO: Make local data deal with account data, and configs.ts just deal with the initial configs that
         everything else needs like flowCommand, accessCheckMode, etc? */
import { commands, window, workspace } from 'vscode'
import { Account } from '../account'
import * as util from 'util'
import * as cp from 'child_process'
import { FILE_PATH_EMPTY } from '../../utils/utils'

const exec = util.promisify(cp.exec)

// The flow.json configuration file used by the extension.

// TODO: Where does HangleConfigChanges() go?

export class Config {
  // Full path to flow.json file
  static configPath: string

  private constructor() {}

  static async getConfigPath() {
    if (!Config.configPath) {
      Config.configPath = await Config.#retrieveConfigPath()
    }
    return Config.configPath
  }

  static async #retrieveConfigPath() {
    // Configuration File
    let configPath = await Config.#readLocalConfig()
    if (configPath === FILE_PATH_EMPTY) {
      if (!Config.#promptInitializeConfig()) { throw Error("No valid config path") }
      configPath = await Config.#readLocalConfig()
    }
    return configPath
  }


  static async #promptInitializeConfig (): Promise<boolean> {
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

  static async #readLocalConfig () : Promise<string> {
    const file = await workspace.findFiles('flow.json')
    if (file.length !== 1) {
      return FILE_PATH_EMPTY
    }
    return file[0].path
  }

  // TODO: What needs to call this?
  // Adds an event handler that prompts the user to reload whenever the config changes
  static #handleConfigChanges (): void {
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
}
