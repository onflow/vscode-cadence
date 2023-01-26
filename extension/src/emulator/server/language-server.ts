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
import { Mutex } from 'async-mutex'
import { exec } from 'child_process'

// Identities for commands handled by the Language server
const CREATE_ACCOUNT_SERVER = 'cadence.server.flow.createAccount'
const SWITCH_ACCOUNT_SERVER = 'cadence.server.flow.switchActiveAccount'
const GET_ACCOUNTS_SERVER = 'cadence.server.flow.getAccounts'
const RESTART_SERVER = 'cadence.server.flow.restart'
const RELOAD_CONFIGURATION = 'cadence.server.flow.reloadConfiguration'

export class LanguageServerAPI {
  client: LanguageClient | null = null
  #clientLock = new Mutex()
  running: boolean = false

  #initializedClient = false
  #emulatorConnected = false

  accessCheckMode: string
  flowCommand: string

  constructor () {
    const settings = Settings.getWorkspaceSettings()
    this.accessCheckMode = settings.accessCheckMode
    this.flowCommand = settings.flowCommand

    void this.startClient()
    void this.watchEmulator()
  }

  deactivate (): void {
    void this.client?.stop()
      .catch((err) => { void err })
  }

  async watchEmulator (): Promise<void> {
    const seconds = 3
    setInterval(async () => {
      const emulatorFound = await this.scanForEmulator()

      if (!this.#emulatorConnected && emulatorFound) {
        void window.showInformationMessage('Connecting to local flow emulator')
      } else if (this.#emulatorConnected && !emulatorFound) {
        console.log('Flow Emulator Disconnected')
      } else {
        return
      }
  
      // Restart LS
      void this.stopClient()
      void this.startClient()
    }, 1000 * seconds)
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
    await this.#clientLock.acquire()

    this.#initializedClient = false
    const configPath = await Config.getConfigPath()
    const numberOfAccounts = Settings.getWorkspaceSettings().numAccounts
    const accessCheckMode = Settings.getWorkspaceSettings().accessCheckMode

    this.#emulatorConnected = await this.scanForEmulator()
    const enableFlowClient = this.#emulatorConnected ? 'true' : 'false'

    //exec('killall dlv') // Uncomment when testing with a local language server

    this.client = new LanguageClient(
      'cadence',
      'Cadence',
      {
        command: this.flowCommand,
        args: ['cadence', 'language-server', '--enable-flow-client=' + enableFlowClient]
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
      }

      void ext.emulatorStateChanged()
    })

    await this.client.start()
      .then(() => {
        void ext.emulatorStateChanged()
        this.watchFlowConfiguration()
      })
      .catch((err: Error) => {
        void window.showErrorMessage(`Cadence language server failed to start: ${err.message}`)
      })
    this.#initializedClient = true

    if (!this.#emulatorConnected) {
      void window.showWarningMessage('Cannot find an instance of flow emulator. Start an emulator ' +
      'to enable interacting with the blockchain by running \'flow emulator\' command in a terminal.')
    }

    this.#clientLock.release()
  }

  async stopClient (): Promise<void> {
    await this.#clientLock.acquire()
    await this.client?.stop().catch(() => {})
    this.client = null
    void ext.emulatorStateChanged()
    this.#clientLock.release()
  }

  emulatorConnected (): boolean {
    return this.#emulatorConnected
  }

  async #sendRequest (cmd: string, args: any[] = []): Promise<any> {
    return await this.client?.sendRequest('workspace/executeCommand', {
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
