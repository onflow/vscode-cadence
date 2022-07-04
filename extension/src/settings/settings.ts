/* Workspace Settings */
import { workspace, window } from 'vscode'

export class Settings {
    static CONFIG_FLOW_COMMAND = 'flowCommand'
    static CONFIG_NUM_ACCOUNTS = 'numAccounts'
    static CONFIG_ACCESS_CHECK_MODE = 'accessCheckMode'

    // Workspace settings singleton
    static #instance: Settings

    flowCommand!: string        // The name of the Flow CLI executable.
    numAccounts!: number
    accessCheckMode!: string

    static getWorkspaceSettings() {
        if (!Settings.#instance) {
            try {
                Settings.#instance = new Settings()
            } catch (err) {
                window.showErrorMessage(`Failed to activate extension: ${String(err)}`)
                .then(() => {}, () => {})
                throw(err)
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
      
        const numAccounts: number | undefined = cadenceConfig.get(
            Settings.CONFIG_NUM_ACCOUNTS
        )
        if (numAccounts === undefined) {
          throw new Error(`Missing ${Settings.CONFIG_NUM_ACCOUNTS} config`)
        }
      
        let accessCheckMode: string | undefined = cadenceConfig.get(
            Settings.CONFIG_ACCESS_CHECK_MODE
        )
        if (accessCheckMode === undefined) {
          accessCheckMode = 'strict'
        }
    }
}