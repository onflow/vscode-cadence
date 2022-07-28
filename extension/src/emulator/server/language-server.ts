import { LanguageClient, State, StateChangeEvent } from 'vscode-languageclient/node'
import { window } from 'vscode'
import { Account } from '../account'
import { ext } from '../../main'
import * as Config from '../local/config'
import { Settings } from '../../settings/settings'
import * as response from './responses'

// The args to pass to the Flow CLI to start the language server.
const START_LANGUAGE_SERVER_ARGS = ['cadence', 'language-server']

export class LanguageServerAPI {
  // Identities for commands handled by the Language server
  static CREATE_ACCOUNT_SERVER = 'cadence.server.flow.createAccount'
  static SWITCH_ACCOUNT_SERVER = 'cadence.server.flow.switchActiveAccount'
  static GET_ACCOUNTS = 'cadence.server.flow.getAccounts'

  client!: LanguageClient
  running: boolean
  accessCheckMode: string
  flowCommand: string

  #initializedClient: boolean

  constructor () {
    const settings = Settings.getWorkspaceSettings()
    this.accessCheckMode = settings.accessCheckMode
    this.flowCommand = settings.flowCommand

    // Init running state with false and update, when client is connected to server
    this.running = false
    this.#initializedClient = false

    void this.startClient()
  }

  deactivate (): void {
    void this.client.stop()
      .catch((err) => { void err })
  }

  async startClient (): Promise<void> {
    this.#initializedClient = false
    const configPath = await Config.getConfigPath()
    const numberOfAccounts = Settings.getWorkspaceSettings().numAccounts

    this.client = new LanguageClient(
      'cadence',
      'Cadence',
      {
        command: this.flowCommand,
        args: START_LANGUAGE_SERVER_ARGS
      },
      {
        documentSelector: [{ scheme: 'file', language: 'cadence' }],
        synchronize: {
          configurationSection: 'cadence'
        },
        initializationOptions: {
          configPath: configPath,
          numberOfAccounts: `${numberOfAccounts}`
        }
      }
    )

    this.client.onDidChangeState((e: StateChangeEvent) => {
      this.running = e.newState === State.Running
      if (this.#initializedClient && !this.running) {
        void window.showErrorMessage('Cadence language server stopped')
      }
      void ext.emulatorStateChanged()
    })

    // This also starts the hosted emulator
    this.client.start()
      .then(() => {
        void window.showInformationMessage('Cadence language server started')
        void ext.emulatorStateChanged()
      })
      .catch((err: Error) => {
        void window.showErrorMessage(`Cadence language server failed to start: ${err.message}`)
      })
    this.#initializedClient = true
  }

  reset (): void {
    void this.client.stop()
    this.running = false
    void this.startClient()
  }

  // Restarts the language server
  async restartServer (): Promise<void> {
    // Stop server
    const activeAccount = ext.getActiveAccount()

    try {
      await this.client.stop()
    } catch (err) {
      console.log('Failed to stop language server!')
    }

    // Reboot server
    void this.client.start()
    if (activeAccount !== null) {
      void this.switchActiveAccount(activeAccount)
    }
    void ext.emulatorStateChanged()
  }

  // Sends a request to switch the currently active account.
  async switchActiveAccount (account: Account): Promise<void> {
    return await this.client.sendRequest('workspace/executeCommand', {
      command: LanguageServerAPI.SWITCH_ACCOUNT_SERVER,
      arguments: [account.name]
    })
  }

  // Sends a request to create a new account. Returns the address of the new
  // account, if it was created successfully.
  async createAccount (): Promise<Account> {
    try {
      const res: any = await this.client.sendRequest('workspace/executeCommand', {
        command: LanguageServerAPI.CREATE_ACCOUNT_SERVER,
        arguments: []
      })

      return new response.ClientAccount(res).asAccount()
    } catch (err) {
      if (err instanceof Error) {
        window.showErrorMessage(`Failed to create account: ${err.message}`)
          .then(() => {}, () => {})
      }
      throw err
    }
  }

  // Sends a request to obtain all account mappings, addresses, names, and active status
  async getAccounts (): Promise<response.GetAccountsReponse> {
    const res: any = await this.client.sendRequest('workspace/executeCommand', {
      command: LanguageServerAPI.GET_ACCOUNTS,
      arguments: []
    })

    return new response.GetAccountsReponse(res)
  }
}
