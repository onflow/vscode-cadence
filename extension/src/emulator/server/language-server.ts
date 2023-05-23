import { LanguageClient, State, StateChangeEvent } from 'vscode-languageclient/node'
import { window } from 'vscode'
import { Account } from '../account'
import { emulatorStateChanged } from '../../main'
import * as Config from '../local/flowConfig'
import { Settings } from '../../settings/settings'
import * as response from './responses'
import { Mutex } from 'async-mutex'
import { exec } from 'child_process'
import { verifyEmulator } from '../local/emulatorScanner'
import { delay } from '../../utils/utils'
import { ExecuteCommandRequest } from 'vscode-languageclient'
import * as telemetry from '../../telemetry/telemetry'

// Identities for commands handled by the Language server
const CREATE_ACCOUNT_SERVER = 'cadence.server.flow.createAccount'
const SWITCH_ACCOUNT_SERVER = 'cadence.server.flow.switchActiveAccount'
const GET_ACCOUNTS_SERVER = 'cadence.server.flow.getAccounts'
const RELOAD_CONFIGURATION = 'cadence.server.flow.reloadConfiguration'

export class LanguageServerAPI {
  client: LanguageClient | null = null
  #clientLock = new Mutex()
  running: boolean = false

  #initializedClient = false
  #emulatorConnected = false
  #restarting = false

  settings: Settings

  constructor (settings: Settings) {
    this.settings = settings
    void this.startClient()
    void this.watchEmulator()
  }

  async deactivate (): Promise<void> {
    await this.client?.stop()
      .catch((err) => { console.log(err) })
  }

  watchEmulator (): void {
    const seconds = 3
    setInterval(() => {
      void (async () => {
        await this.#clientLock.acquire() // Lock to prevent multiple restarts
        const emulatorFound = await verifyEmulator()

        if (this.#emulatorConnected === emulatorFound) {
          this.#clientLock.release()
          return // No changes in local emulator state
        }

        this.#emulatorConnected = emulatorFound

        this.#clientLock.release()

        void this.restart(emulatorFound)
      })()
    }, 1000 * seconds)
  }

  async startClient (enableFlow?: boolean): Promise<void> {
    await this.#clientLock.acquire()

    this.#initializedClient = false
    const numberOfAccounts: number = this.settings.numAccounts
    const accessCheckMode: string = this.settings.accessCheckMode
    let configPath = this.settings.customConfigPath

    if (configPath === '' || configPath === undefined) {
      configPath = await Config.getConfigPath()
    }

    if (enableFlow === undefined) {
      enableFlow = await verifyEmulator()
      this.#emulatorConnected = enableFlow
    }

    if (enableFlow) {
      void telemetry.emulatorConnected()
    }

    if (this.settings.flowCommand !== 'flow') {
      try {
        exec('killall dlv') // Required when running language server locally on mac
      } catch (err) { void err }
    }

    this.client = new LanguageClient(
      'cadence',
      'Cadence',
      {
        command: this.settings.flowCommand,
        args: ['cadence', 'language-server', `--enable-flow-client=${String(enableFlow)}`]
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

    this.client.onDidChangeState(async (e: StateChangeEvent) => {
      this.running = e.newState === State.Running
      if (this.#initializedClient && !this.running && !this.#restarting) {
        // Need to wait in case Windows flow-cli installer is trying to update
        // There must be a small timeframe for this update to occur before
        // restarting the LS, or else the update will fail.
        await delay(5)
      }

      void emulatorStateChanged()
    })

    await this.client.start()
      .then(() => {
        void emulatorStateChanged()
        this.watchFlowConfiguration()
      })
      .catch((err: Error) => {
        void window.showErrorMessage(`Cadence language server failed to start: ${err.message}`)
      })
    this.#initializedClient = true

    if (!enableFlow) {
      void window.showWarningMessage(`Couldn't connect to emulator. Run 'flow emulator' in a terminal 
      to enable all extension features. If you want to deploy contracts, send transactions or execute 
      scripts you need a running emulator.`)
    } else {
      void window.showInformationMessage('Flow Emulator Connected')
    }

    this.#clientLock.release()
  }

  async stopClient (): Promise<void> {
    await this.#clientLock.acquire()
    await this.client?.stop().catch(() => {})
    this.client = null
    void emulatorStateChanged()
    this.#clientLock.release()
  }

  async restart (enableFlow: boolean): Promise<void> {
    this.#restarting = true
    await this.stopClient()
    await this.startClient(enableFlow)
    this.#restarting = false
  }

  emulatorConnected (): boolean {
    return this.#emulatorConnected
  }

  async #sendRequest (cmd: string, args: any[] = []): Promise<any> {
    return await this.client?.sendRequest(ExecuteCommandRequest.type, {
      command: cmd,
      arguments: args
    })
  }

  async reset (): Promise<void> {
    const enableFlow = await verifyEmulator()
    await this.restart(enableFlow)
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
