import { LanguageClient, State, StateChangeEvent } from 'vscode-languageclient/node'
import { window } from 'vscode'
import { EmulatorState } from '../emulator-controller'
import { Account } from '../account'
import { ext } from '../../main'
import * as Config from '../local/config'
import { Settings } from '../../settings/settings'

// The args to pass to the Flow CLI to start the language server.
const START_LANGUAGE_SERVER_ARGS = ['cadence', 'language-server']

export class LanguageServerAPI {
  // Identities for commands handled by the Language server
  static CREATE_ACCOUNT_SERVER = 'cadence.server.flow.createAccount'
  static CREATE_DEFAULT_ACCOUNTS_SERVER = 'cadence.server.flow.createDefaultAccounts'
  static SWITCH_ACCOUNT_SERVER = 'cadence.server.flow.switchActiveAccount'
  static CHANGE_EMULATOR_STATE = 'cadence.server.flow.changeEmulatorState'
  static INIT_ACCOUNT_MANAGER = 'cadence.server.flow.initAccountManager'

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

  async initAccountManager (): Promise<void> {
    return await this.client.sendRequest('workspace/executeCommand', {
      command: LanguageServerAPI.INIT_ACCOUNT_MANAGER,
      arguments: []
    })
  }

  async changeEmulatorState (emulatorState: EmulatorState): Promise<void> {
    return await this.client.sendRequest('workspace/executeCommand', {
      command: LanguageServerAPI.CHANGE_EMULATOR_STATE,
      arguments: [emulatorState]
    })
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
    const res: any = await this.client.sendRequest('workspace/executeCommand', {
      command: LanguageServerAPI.CREATE_ACCOUNT_SERVER,
      arguments: []
    })
    const { name, address } = res
    return new Account(name, address)
  }

  // Sends a request to create a set of default accounts. Returns the addresses of the new
  // accounts, if they were created successfully.
  async createDefaultAccounts (count: number): Promise<Account[]> {
    const res: [] = await this.client.sendRequest('workspace/executeCommand', {
      command: LanguageServerAPI.CREATE_DEFAULT_ACCOUNTS_SERVER,
      arguments: [count]
    })
    const accounts: Account [] = []
    for (const account of res) {
      const { name, address } = account
      accounts.push(new Account(name, address))
    }
    return accounts
  }
}
