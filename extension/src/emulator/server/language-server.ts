import { LanguageClient, State, StateChangeEvent } from 'vscode-languageclient/node'
import { window } from 'vscode'
import { Account } from '../account'
import { ext } from '../../main'
import * as Config from '../local/config'
import { Settings } from '../../settings/settings'
import * as response from './responses'
import sleepSynchronously from 'sleep-synchronously'
import { Socket } from 'net'
import portScanner = require('portscanner-sync')
import awaitToJs = require('await-to-js')

// Identities for commands handled by the Language server
const CREATE_ACCOUNT_SERVER = 'cadence.server.flow.createAccount'
const SWITCH_ACCOUNT_SERVER = 'cadence.server.flow.switchActiveAccount'
const GET_ACCOUNTS_SERVER = 'cadence.server.flow.getAccounts'
const RESTART_SERVER = 'cadence.server.flow.restart'
const RELOAD_CONFIGURATION = 'cadence.server.flow.reloadConfiguration'

export class LanguageServerAPI {
  client!: LanguageClient
  running: boolean
  accessCheckMode: string
  flowCommand: string

  #initializedClient: boolean
  #firstInitialization: boolean
  #emulatorConnected = false

  constructor () {
    const settings = Settings.getWorkspaceSettings()
    this.accessCheckMode = settings.accessCheckMode
    this.flowCommand = settings.flowCommand

    // Init running state with false and update, when client is connected to server
    this.running = false
    this.#initializedClient = false
    this.#firstInitialization = true

    void this.startClient()

    // Monitor local emulator status and set LS emulator as required
    const intervalSeconds = 5
    sleepSynchronously(1000 * intervalSeconds)
    setInterval(() => {
      void this.watchEmulator()
    }, 1000 * intervalSeconds)
  }

  deactivate (): void {
    void this.client.stop()
      .catch((err) => { void err })
  }

  async watchEmulator (): Promise<void> {
    const emulatorFound = await this.scanForEmulator()

    if (!this.#emulatorConnected && emulatorFound) {
      void window.showInformationMessage('Local flow emulator found. Connecting...')
    } else if (this.#emulatorConnected && !emulatorFound) {
      void window.showWarningMessage('Flow emulator disconnected. Blockchain interaction features have ' +
      'been disabled. Start a local emulator by running the \'flow emulator\' command in a terminal.')
    } else {
      return
    }

    // Restart LS
    void this.stopClient()
    void this.startClient()
  }

  async scanForEmulator (): Promise<boolean> {
    const defaultHost = '127.0.0.1'
    const defaultPort = 3569
    const sock = new Socket()
    sock.setTimeout(2500)

    const [err, status] = await awaitToJs.to(portScanner.checkPortStatus(defaultPort, defaultHost))
    if (err != null) {
      console.error(err)
      return false
    }
    if (status !== 'open') {
      return false
    }

    return true
  }

  async startClient (): Promise<void> {
    this.#initializedClient = false
    const configPath = await Config.getConfigPath()
    const numberOfAccounts = Settings.getWorkspaceSettings().numAccounts
    const accessCheckMode = Settings.getWorkspaceSettings().accessCheckMode

    this.#emulatorConnected = await this.scanForEmulator()
    const enableFlowClient = this.#emulatorConnected ? 'true' : 'false'

    if (this.#emulatorConnected) {
      void window.showInformationMessage('Starting Cadence language server with local connected emulator...')
    } else {
      void window.showInformationMessage('Starting Cadence language server with no emulator...')
    }

    this.client = new LanguageClient(
      'cadence',
      'Cadence',
      {
        command: this.flowCommand,
        args: ['cadence', 'language-server']// '--enableFlowClient=' + enableFlowClient]
      },
      {
        documentSelector: [{ scheme: 'file', language: 'cadence' }],
        synchronize: {
          configurationSection: 'cadence'
        },
        initializationOptions: {
          configPath,
          numberOfAccounts: `${numberOfAccounts}`,
          accessCheckMode
        }
      }
    )

    this.client.onDidChangeState((e: StateChangeEvent) => {
      this.running = e.newState === State.Running
      if (this.#initializedClient && !this.running) {
        sleepSynchronously(1000 * 5) // Wait enable flow-cli update
      } else if (this.running) {
        if (this.#emulatorConnected) {
          void window.showInformationMessage('Flow emulator connected')
        }
      }

      void ext.emulatorStateChanged()
    })

    void this.client.start()
      .then(() => {
        void ext.emulatorStateChanged()
        this.watchFlowConfiguration()
      })
      .catch((err: Error) => {
        void window.showErrorMessage(`Cadence language server failed to start: ${err.message}`)
      })
    this.#initializedClient = true

    if (this.#firstInitialization && !this.#emulatorConnected) {
      void window.showWarningMessage('Could not find instance of flow emulator. Start an emulator ' +
      'to enable interacting with the blockchain by running \'flow emulator\' command in a terminal.')
    }
    this.#firstInitialization = false
  }

  async stopClient (): Promise<void> {
    this.client.stop().catch((err: Error) => {
      console.log(err)
    })
    void ext.emulatorStateChanged()
  }

  emulatorConnected (): boolean {
    return this.#emulatorConnected
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

  // Watch and reload flow configuration when changed.
  watchFlowConfiguration (): void {
    void Config.watchFlowConfigChanges(async () => await this.#sendRequest(RELOAD_CONFIGURATION))
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
