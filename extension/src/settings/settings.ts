/* Workspace Settings */
import { workspace, window } from 'vscode'

export class Settings {
  static CONFIG_FLOW_COMMAND = 'flowCommand'
  static CONFIG_NUM_ACCOUNTS = 'numAccounts'
  static CONFIG_ACCESS_CHECK_MODE = 'accessCheckMode'
  static ACTIVATE_TELEMETRY = 'activateTelemetry'

  // Workspace settings singleton
  static #instance: Settings | undefined

  flowCommand!: string // The name of the Flow CLI executable.
  numAccounts!: number
  accessCheckMode!: string
  activateTelemetry!: boolean

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

  private constructor () {
    // Retrieve workspace settings
    const cadenceConfig = workspace.getConfiguration('cadence')

    const flowCommand: string | undefined = cadenceConfig.get(
      Settings.CONFIG_FLOW_COMMAND
    )
    if (flowCommand === undefined) {
      throw new Error(`Missing ${Settings.CONFIG_FLOW_COMMAND} config`)
    }
    this.flowCommand = flowCommand

    const numAccounts: number | undefined = cadenceConfig.get(
      Settings.CONFIG_NUM_ACCOUNTS
    )
    if (numAccounts === undefined) {
      throw new Error(`Missing ${Settings.CONFIG_NUM_ACCOUNTS} config`)
    }
    this.numAccounts = numAccounts

    let accessCheckMode: string | undefined = cadenceConfig.get(
      Settings.CONFIG_ACCESS_CHECK_MODE
    )
    if (accessCheckMode === undefined) {
      accessCheckMode = 'strict'
    }
    this.accessCheckMode = accessCheckMode

    let activateTelemetry: boolean | undefined = cadenceConfig.get(
      Settings.ACTIVATE_TELEMETRY
    )
    if (activateTelemetry === undefined) {
      activateTelemetry = true
    }
    this.activateTelemetry = activateTelemetry
  }
}
