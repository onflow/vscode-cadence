/* Workspace Settings */
import { workspace, window } from 'vscode'

export class Settings {
  static CONFIG_FLOW_COMMAND = 'flowCommand'
  static CONFIG_NUM_ACCOUNTS = 'numAccounts'
  static CONFIG_ACCESS_CHECK_MODE = 'accessCheckMode'
  static CONFIG_CUSTOM_CONFIG_PATH = 'customConfigPath'

  // Workspace settings singleton
  static #instance: Settings | undefined

  flowCommand!: string // The name of the Flow CLI executable.
  numAccounts!: number
  accessCheckMode!: string
  customConfigPath!: string // If empty then search the workspace for flow.json

  #didChange: Subject<void> = new Subject()
  get didChange$ (): Observable<void> {
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
      if (e.affectsConfiguration('cadence')) {
        this.#loadSettings()
        this.#didChange.next()
      }
    })

    this.#loadSettings()
  }

  #loadSettings (): void {
    // Retrieve workspace settings
    const cadenceConfig = workspace.getConfiguration('cadence')

    const flowCommand: string | undefined = cadenceConfig.get(
      Settings.CONFIG_FLOW_COMMAND
    )
    if (flowCommand === undefined) {
      throw new Error(`Missing ${Settings.CONFIG_FLOW_COMMAND} config`)
    }
    this.flowCommand = flowCommand

    let numAccounts: number | undefined = cadenceConfig.get(
      Settings.CONFIG_NUM_ACCOUNTS
    )
    if (numAccounts === undefined || numAccounts <= 0) {
      numAccounts = 3
    }
    this.numAccounts = numAccounts

    let accessCheckMode: string | undefined = cadenceConfig.get(
      Settings.CONFIG_ACCESS_CHECK_MODE
    )
    if (accessCheckMode === undefined) {
      accessCheckMode = 'strict'
    }
    this.accessCheckMode = accessCheckMode

    let customConfigPath: string | undefined = cadenceConfig.get(
      Settings.CONFIG_CUSTOM_CONFIG_PATH
    )
    if (customConfigPath === undefined) {
      customConfigPath = ''
    }
    this.customConfigPath = customConfigPath
  }
}
