import { LanguageClient, State } from 'vscode-languageclient/node'
import { window } from 'vscode'
import { Account } from '../account'
import { emulatorStateChanged } from '../../main'
import * as Config from '../local/flowConfig'
import { Settings } from '../../settings/settings'
import * as response from './responses'
import { exec } from 'child_process'
import { verifyEmulator } from '../local/emulatorScanner'
import { Disposable, ExecuteCommandRequest } from 'vscode-languageclient'
import { BehaviorSubject, combineLatest, filter, firstValueFrom, map } from 'rxjs'
import * as telemetry from '../../telemetry/telemetry'
import { envVars } from '../../utils/shell/env-vars'

// Identities for commands handled by the Language server
const CREATE_ACCOUNT_SERVER = 'cadence.server.flow.createAccount'
const SWITCH_ACCOUNT_SERVER = 'cadence.server.flow.switchActiveAccount'
const GET_ACCOUNTS_SERVER = 'cadence.server.flow.getAccounts'
const RELOAD_CONFIGURATION = 'cadence.server.flow.reloadConfiguration'

export enum EmulatorState {
  Connected,
  Connecting,
  Disconnected,
}
export class LanguageServerAPI {
  client: LanguageClient | null = null
  settings: Settings

  clientState$ = new BehaviorSubject<State>(State.Stopped)
  flowEnabled$ = new BehaviorSubject<boolean>(false)
  emulatorState$ = new BehaviorSubject<EmulatorState>(EmulatorState.Disconnected)

  #watcherTimeout: NodeJS.Timeout | null = null
  #watcherPromise: Promise<void> | null = null
  #flowConfigWatcher: Promise<Disposable> | null = null

  constructor (settings: Settings) {
    this.settings = settings

    // Map client state to emulator state
    combineLatest({ clientState: this.clientState$, flowEnabled: this.flowEnabled$ }).pipe(
      map(({ clientState, flowEnabled }) => {
        // Emulator will always be disconnected if not using flow
        if (!flowEnabled) return EmulatorState.Disconnected

        if (clientState === State.Running) {
          return EmulatorState.Connected
        } else if (clientState === State.Starting) {
          return EmulatorState.Connecting
        } else {
          return EmulatorState.Disconnected
        }
      })
    ).subscribe((state) => {
      this.emulatorState$.next(state)
    })

    // Subscribe to emulator state changes
    this.emulatorState$.subscribe(emulatorStateChanged)
  }

  async activate (): Promise<void> {
    await this.deactivate()
    void this.watchEmulator()
    void this.watchFlowConfiguration()
  }

  async deactivate (): Promise<void> {
    const deactivationPromises = [this.#watcherPromise]
    if (this.#watcherTimeout != null) {
      clearTimeout(this.#watcherTimeout)
      this.#watcherTimeout = null
    }
    if (this.#flowConfigWatcher != null) deactivationPromises.push(this.#flowConfigWatcher.then(watcher => watcher.dispose()))
    deactivationPromises.push(this.stopClient())
    await Promise.all(deactivationPromises)
  }

  get isActive (): boolean {
    return this.#watcherTimeout != null
  }

  watchEmulator (): void {
    // Polling interval in milliseconds
    const pollingIntervalMs = 1000

    // Loop with setTimeout to avoid overlapping calls
    async function loop (this: LanguageServerAPI): Promise<void> {
      this.#watcherPromise = (async () => {
        try {
          // Wait for client to connect or disconnect
          if (this.clientState$.getValue() === State.Starting) return

          // Check if emulator state has changed
          const emulatorFound = await verifyEmulator()
          if ((this.emulatorState$.getValue() === EmulatorState.Connected) === emulatorFound) {
            return // No changes in local emulator state
          }

          if (this.#watcherTimeout === null) return

          // Restart language server
          await this.stopClient()
          await this.startClient(emulatorFound)
        } catch (err) {
          console.error(err)
        }
      })()

      // Wait for watcher to finish
      await this.#watcherPromise

      // If watcher hasn't been disposed, restart loop
      if (this.#watcherTimeout != null) {
        this.#watcherTimeout = setTimeout(() => { void loop.bind(this)() }, pollingIntervalMs)
      }
    }

    // Start loop, must be a timeout for aborts to work
    this.#watcherTimeout = setTimeout(() => { void loop.bind(this)() }, 0)
  }

  async startClient (enableFlow: boolean): Promise<void> {
    // Prevent starting multiple times
    if (this.clientState$.getValue() === State.Starting) {
      const newState = await firstValueFrom(this.clientState$.pipe(filter(state => state !== State.Starting)))
      if (newState === State.Running) { return }
    } else if (this.clientState$.getValue() === State.Running) {
      return
    }

    // Set client state to starting
    this.clientState$.next(State.Starting)

    // Set whether flow integration is enabled
    this.flowEnabled$.next(enableFlow)

    if (enableFlow) {
      void telemetry.emulatorConnected()
    }

    const numberOfAccounts: number = this.settings.numAccounts
    const accessCheckMode: string = this.settings.accessCheckMode
    let configPath = this.settings.customConfigPath

    if (configPath === '' || configPath === undefined) {
      console.log("enter")
      configPath = await Config.getConfigPath()
      console.log("exit")
    }

    if (this.settings.flowCommand !== 'flow') {
      try {
        exec('killall dlv') // Required when running language server locally on mac
      } catch (err) { void err }
    }

    const env = await envVars.getValue()
    this.client = new LanguageClient(
      'cadence',
      'Cadence',
      {
        command: this.settings.flowCommand,
        args: ['cadence', 'language-server', `--enable-flow-client=${String(enableFlow)}`],
        options: {
          env
        }
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

    this.client.onDidChangeState((event) => {
      this.clientState$.next(event.newState)
    })

    await this.client.start()
      .catch((err: Error) => {
        void window.showErrorMessage(`Cadence language server failed to start: ${err.message}`)
      })

    if (!enableFlow) {
      void window.showWarningMessage(`Couldn't connect to emulator. Run 'flow emulator' in a terminal 
      to enable all extension features. If you want to deploy contracts, send transactions or execute 
      scripts you need a running emulator.`)
    } else {
      void window.showInformationMessage('Flow Emulator Connected')
    }
  }

  async stopClient (): Promise<void> {
    // Prevent stopping multiple times (important since LanguageClient state may be startFailed)
    if (this.clientState$.getValue() === State.Stopped) return

    // Set emulator state to disconnected
    this.clientState$.next(State.Stopped)

    await this.client?.stop()
    this.client = null
  }

  async restart (): Promise<void> {
    if(!this.isActive) {
      window.showErrorMessage('Client failed to restart, are you sure you have the Flow CLI installed?')
      throw new Error('Client failed to restart')
    }
    
    // To restart, simply stop the client and the watcher will restart it
    await this.stopClient()
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.showErrorMessage('Client failed to restart, please restart VSCode')
        reject(new Error('Client failed to restart'))
      }, 5000)

      firstValueFrom(this.clientState$.pipe(filter(state => state === State.Running))).then(() => {
        resolve()
        clearTimeout(timeout)
      })
    })
  }

  emulatorConnected (): boolean {
    return this.emulatorState$.getValue() === EmulatorState.Connected
  }

  async #sendRequest (cmd: string, args: any[] = []): Promise<any> {
    return await this.client?.sendRequest(ExecuteCommandRequest.type, {
      command: cmd,
      arguments: args
    })
  }

  // Sends a request to switch the currently active account.
  async switchActiveAccount (account: Account): Promise<void> {
    return await this.#sendRequest(SWITCH_ACCOUNT_SERVER, [account.name])
  }

  // Watch and reload flow configuration when changed.
  async watchFlowConfiguration (): Promise<void> {
    // Dispose of existing watcher
    (await this.#flowConfigWatcher)?.dispose()

    // Watch for changes to flow configuration
    this.#flowConfigWatcher = Config.watchFlowConfigChanges(async () => {
      Config.flowConfig.invalidate()

      // Reload configuration command is only available when flow integration is enabled
      if (!this.flowEnabled$.getValue()) return

      if (this.clientState$.getValue() === State.Running) {
        await this.#sendRequest(RELOAD_CONFIGURATION)
      } else if (this.clientState$.getValue() === State.Starting) {
        // Wait for client to connect
        void firstValueFrom(this.clientState$.pipe(filter((state) => state === State.Running))).then(() => {
          void this.#sendRequest(RELOAD_CONFIGURATION)
        })
      }
    })
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
