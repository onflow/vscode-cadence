/* Workspace Settings */
import { Subject } from 'rxjs'
import { workspace, window, WorkspaceConfiguration } from 'vscode'

export interface CadenceConfiguration extends WorkspaceConfiguration {
  flowCommand: string
  numAccounts: number
  accessCheckMode: string
  customConfigPath: string
}

export class Settings {
  // Workspace settings singleton
  static #instance: Settings | undefined

  flowCommand!: string // The name of the Flow CLI executable.
  numAccounts!: number
  accessCheckMode!: string
  customConfigPath!: string // If empty then search the workspace for flow.json

  #didChange: Subject<void> = new Subject()
  get didChange$ () {
    return this.#didChange.asObservable()
  }

  static getWorkspaceSettings (): Settings {
    if (Settings.#instance === undefined) {
      try {
        Settings.#instance = new Settings()
      } catch (err) {
        window.showErrorMessage(`Failed to activate extension: ${String(err)}`)
          .then(() => {}, () => {})
        throw (Error('Could not retrieve workspace settings'))
      }
    }
    return Settings.#instance
  }

  constructor (skipInitialization?: boolean) {
    if (skipInitialization !== undefined && skipInitialization) {
      return
    }

    // Watch for workspace settings changes
    workspace.onDidChangeConfiguration((e) => {
      if(e.affectsConfiguration('cadence')) {
        /*if(e.affectsConfiguration('cadence.flowCommand')) {
          const flowCommand: string | undefined = workspace.getConfiguration('cadence').get(Settings.CONFIG_FLOW_COMMAND)
          if (flowCommand === undefined) {
            throw new Error(`Missing ${Settings.CONFIG_FLOW_COMMAND} config`)
          }
          this.flowCommand = flowCommand
        }*/
        this.loadSettings()
        this.#didChange.next()
      }
    })

    this.loadSettings()
  }

  loadSettings() {
    // Retrieve workspace settings
    const cadenceConfig: CadenceConfiguration = workspace.getConfiguration('cadence') as CadenceConfiguration

    const flowCommand: string | undefined = cadenceConfig.flowCommand
    if (flowCommand === undefined) {
      throw new Error(`Missing flowCommand config`)
    }
    this.flowCommand = flowCommand

    let numAccounts: number | undefined = cadenceConfig.numAccounts
    if (numAccounts === undefined || numAccounts <= 0) {
      numAccounts = 3
    }
    this.numAccounts = numAccounts

    let accessCheckMode: string | undefined = cadenceConfig.accessCheckMode
    if (accessCheckMode === undefined) {
      accessCheckMode = 'strict'
    }
    this.accessCheckMode = accessCheckMode

    let customConfigPath: string | undefined = cadenceConfig.customConfigPath
    if (customConfigPath === undefined) {
      customConfigPath = ''
    }
    this.customConfigPath = customConfigPath
  }
}
