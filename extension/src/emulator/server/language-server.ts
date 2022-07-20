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
  static LIST_ALL_ACCOUNTS = 'cadence.server.flow.getAccounts'

  client!: LanguageClient
  running: boolean
  accessCheckMode: string
  flowCommand: string

  constructor () {
    const settings = Settings.getWorkspaceSettings()
    this.accessCheckMode = settings.accessCheckMode
    this.flowCommand = settings.flowCommand

    // Init running state with false and update, when client is connected to server
    this.running = false

    void this.startClient()
  }

  deactivate (): void {
    void this.client.stop()
      .catch((err) => { void err })
  }

  async startClient (): Promise<void> {
    const configPath = await Config.getConfigPath()
    const emulatorState = ext.getEmulatorState()

    const activeAccount = ext.getActiveAccount()
    const activeAccountName = (activeAccount != null) ? activeAccount.name : ''
    const activeAccountAddress = (activeAccount != null) ? activeAccount.address : ''

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
          accessCheckMode: Settings.getWorkspaceSettings().accessCheckMode,
          configPath,
          emulatorState,
          activeAccountName,
          activeAccountAddress
        }
      }
    )

    this.client.onDidChangeState((e: StateChangeEvent) => {
      this.running = e.newState === State.Running
    })

    // This also starts the hosted emulator
    this.client.start()
      .then(() =>
        window.showInformationMessage('Cadence language server started')
      )
      .catch((err: Error) => {
        void window.showErrorMessage(`Cadence language server failed to start: ${err.message}`)
      })
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
    await this.client.stop()

    // Reboot server
    void this.client.start()
    if (activeAccount !== null) {
      void this.switchActiveAccount(activeAccount)
    }
    ext.emulatorStateChanged()
  }

  // Sends a request to switch the currently active account.
  async switchActiveAccount (account: Account): Promise<void> {
    const { name, address } = account
    return await this.client.sendRequest('workspace/executeCommand', {
      command: LanguageServerAPI.SWITCH_ACCOUNT_SERVER,
      arguments: [name, address]
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

      const { name, address } = res
      return new Account(name, address)
    } catch (err) {
      window.showErrorMessage(`Failed to create account: ${err.message as string}`)
        .then(() => {}, () => {})
      throw err
    }
  }

  // Sends a request to obtain all account mappings, addresses, names, and active status
  async listAllAccounts (): Promise<response.ListAccountsReponse> {
    const res: any = await this.client.sendRequest('workspace/executeCommand', {
      command: LanguageServerAPI.LIST_ALL_ACCOUNTS,
      arguments: []
    })

    return new response.ListAccountsReponse(res)
  }
}
