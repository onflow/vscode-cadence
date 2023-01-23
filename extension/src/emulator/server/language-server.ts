import { LanguageClient, State, StateChangeEvent } from 'vscode-languageclient/node'
import { window } from 'vscode'
import { Account } from '../account'
import { ext } from '../../main'
import * as Config from '../local/config'
import { Settings } from '../../settings/settings'
import * as response from './responses'
import sleepSynchronously from 'sleep-synchronously'

// Identities for commands handled by the Language server
const CREATE_ACCOUNT_SERVER = 'cadence.server.flow.createAccount'
const SWITCH_ACCOUNT_SERVER = 'cadence.server.flow.switchActiveAccount'
const GET_ACCOUNTS_SERVER = 'cadence.server.flow.getAccounts'
const RESTART_SERVER = 'cadence.server.flow.restart'

export class LanguageServerAPI {
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
    void window.showInformationMessage('Starting Cadence language server...')
    this.#initializedClient = false
    const configPath = await Config.getConfigPath()
    const numberOfAccounts = Settings.getWorkspaceSettings().numAccounts

    this.client = new LanguageClient(
      'cadence',
      'Cadence',
      {
        command: this.flowCommand,
        args: ['cadence', 'language-server']
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
        sleepSynchronously(1000 * 5) // Wait enable flow-cli update
      } else if (this.running) {
        void window.showInformationMessage('Cadence language server started')
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

  async #sendRequest (cmd: string, args: any[] = []): Promise<any> {
    return await this.client.sendRequest('workspace/executeCommand', {
      command: cmd,
      arguments: args
    })
  }

  async reset (): Promise<void> {
    await this.#sendRequest(RESTART_SERVER)
  }

  // Sends a request to switch the currently active account.
  async switchActiveAccount (account: Account): Promise<void> {
    return await this.#sendRequest(SWITCH_ACCOUNT_SERVER, [account.name])
  }

  // Sends a request to create a new account. Returns the address of the new
  // account, if it was created successfully.
  async createAccount (): Promise<Account> {
    try {
      const res: any = await this.#sendRequest(CREATE_ACCOUNT_SERVER)
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
    const res = await this.#sendRequest(GET_ACCOUNTS_SERVER)
    return new response.GetAccountsReponse(res)
  }
}
