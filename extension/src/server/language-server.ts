import { LanguageClient, State } from 'vscode-languageclient/node'
import { window } from 'vscode'
import { Settings } from '../settings/settings'
import { exec } from 'child_process'
import { ExecuteCommandRequest } from 'vscode-languageclient'
import { BehaviorSubject, Subscription, filter, firstValueFrom, skip, zip } from 'rxjs'
import { envVars } from '../utils/shell/env-vars'
import { FlowConfig } from './flow-config'
import { CliProvider } from '../flow-cli/cli-provider'

// Identities for commands handled by the Language server
const RELOAD_CONFIGURATION = 'cadence.server.flow.reloadConfiguration'

export class LanguageServerAPI {
  #settings: Settings
  #config: FlowConfig
  #cliProvider: CliProvider
  client: LanguageClient | null = null

  clientState$ = new BehaviorSubject<State>(State.Stopped)
  #subscriptions: Subscription[] = []

  #isActive = false

  constructor (settings: Settings, cliProvider: CliProvider, config: FlowConfig) {
    this.#settings = settings
    this.#cliProvider = cliProvider
    this.#config = config
  }

  async activate (): Promise<void> {
    if (this.isActive) return
    await this.deactivate()

    this.#isActive = true
    await this.startClient().catch(() => {})
    this.#subscribeToConfigChanges()
    this.#subscribeToSettingsChanges()
  }

  async deactivate (): Promise<void> {
    this.#isActive = false
    this.#subscriptions.forEach((sub) => sub.unsubscribe())
    await this.stopClient()
  }

  get isActive (): boolean {
    return this.#isActive
  }

  async startClient (): Promise<void> {
    try {
      // Prevent starting multiple times
      if (this.clientState$.getValue() === State.Starting) {
        const newState = await firstValueFrom(this.clientState$.pipe(filter(state => state !== State.Starting)))
        if (newState === State.Running) { return }
      } else if (this.clientState$.getValue() === State.Running) {
        return
      }

      // Set client state to starting
      this.clientState$.next(State.Starting)

      const accessCheckMode: string = this.#settings.getSettings().accessCheckMode
      const configPath: string | null = this.#config.configPath

      const binaryPath = (await this.#cliProvider.getCurrentBinary())?.name
      if (binaryPath == null) {
        throw new Error('No flow binary found')
      }

      if (binaryPath !== 'flow') {
        try {
          exec('killall dlv') // Required when running language server locally on mac
        } catch (err) { void err }
      }

      const env = await envVars.getValue()
      this.client = new LanguageClient(
        'cadence',
        'Cadence',
        {
          command: binaryPath,
          args: ['cadence', 'language-server', '--enable-flow-client=false'],
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
    } catch (e) {
      await this.client?.stop()
      this.clientState$.next(State.Stopped)
      throw e
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
    await this.stopClient()
    await this.startClient()
  }

  #subscribeToConfigChanges (): void {
    const tryReloadConfig = (): void => { void this.#sendRequest(RELOAD_CONFIGURATION).catch(() => {}) }

    this.#subscriptions.push(this.#config.fileModified$.subscribe(() => {
      // Reload configuration
      if (this.clientState$.getValue() === State.Running) {
        tryReloadConfig()
      } else if (this.clientState$.getValue() === State.Starting) {
        // Wait for client to connect
        void firstValueFrom(this.clientState$.pipe(filter((state) => state === State.Running))).then(() => {
          tryReloadConfig()
        })
      }
    }))

    this.#subscriptions.push(this.#config.pathChanged$.subscribe(() => {
      // Restart client
      void this.restart()
    }))
  }

  #subscribeToSettingsChanges (): void {
    const onChange = (): void => {
      // Restart client
      void this.restart()
    }

    const subscription = zip(
      this.#cliProvider.currentBinary$.pipe(skip(1)),
      this.#settings.settings$((config) => config.flowCommand).pipe(skip(1))
    ).subscribe(onChange)
    this.#subscriptions.push(subscription)
  }

  async #sendRequest (cmd: string, args: any[] = []): Promise<any> {
    return await this.client?.sendRequest(ExecuteCommandRequest.type, {
      command: cmd,
      arguments: args
    })
  }
}
