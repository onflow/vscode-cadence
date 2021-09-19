import { LanguageClient, State, StateChangeEvent } from 'vscode-languageclient/node'
import { ExtensionContext, window } from 'vscode'
import { Config } from './config'
import {
  CREATE_ACCOUNT_SERVER,
  CREATE_DEFAULT_ACCOUNTS_SERVER,
  SWITCH_ACCOUNT_SERVER,
  CHANGE_EMULATOR_STATE,
  INIT_ACCOUNT_MANAGER
} from './commands'
import { EmulatorState } from './extension'
import { Account } from './account'

// The args to pass to the Flow CLI to start the language server.
const START_LANGUAGE_SERVER_ARGS = ['cadence', 'language-server']

export class LanguageServerAPI {
  client: LanguageClient
  running: boolean

  constructor (ctx: ExtensionContext, config: Config, emulatorState: EmulatorState, activeAccount: Account | null) {
    // Init running state with false and update, when client is connected to server
    this.running = false

    const activeAccountName = activeAccount?.name ?? ''
    const activeAccountAddress = activeAccount?.address ?? ''
    const { configPath } = config

    this.client = new LanguageClient(
      'cadence',
      'Cadence',
      {
        command: config.flowCommand,
        args: START_LANGUAGE_SERVER_ARGS
      },
      {
        documentSelector: [{ scheme: 'file', language: 'cadence' }],
        synchronize: {
          configurationSection: 'cadence'
        },
        initializationOptions: {
          accessCheckMode: config.accessCheckMode,
          configPath,
          emulatorState,
          activeAccountName,
          activeAccountAddress
        }
      }
    )

    this.client
      .onReady()
      .then(() =>
        window.showInformationMessage('Cadence language server started')
      )
      .catch((err: Error) =>
        window.showErrorMessage(`Cadence language server failed to start: ${err.message}`)
      )

    this.client.onDidChangeState((e: StateChangeEvent) => {
      this.running = e.newState === State.Running
    })

    const clientDisposable = this.client.start()
    ctx.subscriptions.push(clientDisposable)
  }

  async initAccountManager (): Promise<void> {
    return await this.client.sendRequest('workspace/executeCommand', {
      command: INIT_ACCOUNT_MANAGER,
      arguments: []
    })
  }

  async changeEmulatorState (emulatorState: EmulatorState): Promise<void> {
    return await this.client.sendRequest('workspace/executeCommand', {
      command: CHANGE_EMULATOR_STATE,
      arguments: [emulatorState]
    })
  }

  // Sends a request to switch the currently active account.
  async switchActiveAccount (account: Account): Promise<void> {
    const { name, address } = account
    return await this.client.sendRequest('workspace/executeCommand', {
      command: SWITCH_ACCOUNT_SERVER,
      arguments: [name, address]
    })
  }

  // Sends a request to create a new account. Returns the address of the new
  // account, if it was created successfully.
  async createAccount (): Promise<Account> {
    const res: any = await this.client.sendRequest('workspace/executeCommand', {
      command: CREATE_ACCOUNT_SERVER,
      arguments: []
    })
    const { name, address } = res
    return new Account(name, address)
  }

  // Sends a request to create a set of default accounts. Returns the addresses of the new
  // accounts, if they were created successfully.
  async createDefaultAccounts (count: number): Promise<Account[]> {
    const res: [] = await this.client.sendRequest('workspace/executeCommand', {
      command: CREATE_DEFAULT_ACCOUNTS_SERVER,
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
