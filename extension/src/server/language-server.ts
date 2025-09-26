import { LanguageClient, State } from 'vscode-languageclient/node'
import { window, workspace } from 'vscode'
import { Settings } from '../settings/settings'
import { exec } from 'child_process'
import { ExecuteCommandRequest } from 'vscode-languageclient'
import { BehaviorSubject, Subscription, filter, firstValueFrom, skip } from 'rxjs'
import { envVars } from '../utils/shell/env-vars'
import { CliProvider } from '../flow-cli/cli-provider'
import { KNOWN_FLOW_COMMANDS } from '../flow-cli/cli-versions-provider'

export class LanguageServerAPI {
  #settings: Settings
  #cliProvider: CliProvider
  client: LanguageClient | null = null

  clientState$ = new BehaviorSubject<State>(State.Stopped)
  #subscriptions: Subscription[] = []

  #isActive = false

  constructor (settings: Settings, cliProvider: CliProvider) {
    this.#settings = settings
    this.#cliProvider = cliProvider
  }

  // Activates the language server manager
  // This will control the lifecycle of the language server
  // & restart it when necessary
  async activate (): Promise<void> {
    if (this.isActive) return
    await this.deactivate()

    this.#isActive = true

    this.#subscribeToSettingsChanges()
    this.#subscribeToBinaryChanges()

    // Report error, but an error starting is non-terminal
    // The server will be restarted if conditions change which make it possible
    // (e.g. a new binary is selected, or the config file is created)
    await this.startClient().catch((e) => {
      console.error(e)
    })
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

      const binaryPath = (await this.#cliProvider.getCurrentBinary())?.command
      if (binaryPath == null) {
        throw new Error('No flow binary found')
      }

      if (binaryPath !== KNOWN_FLOW_COMMANDS.DEFAULT) {
        try {
          exec('killall dlv') // Required when running language server locally on mac
        } catch (err) { void err }
      }

      const env = await envVars.getValue()
      const configPath = workspace.getConfiguration('cadence').get<string>('customConfigPath') ?? ''
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
          initializationOptions: { accessCheckMode, configPath }
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
      await this.stopClient()
      throw e
    }
  }

  async stopClient (): Promise<void> {
    // Set emulator state to disconnected
    this.clientState$.next(State.Stopped)

    await this.client?.stop()
    await this.client?.dispose()
    this.client = null
  }

  async restart (): Promise<void> {
    await this.stopClient()
    await this.startClient()
  }

  #subscribeToSettingsChanges (): void {
    // Subscribe to changes in the flowCommand setting to restart the client
    // Skip the first value since we don't want to restart the client when it's first initialized
    this.#settings.watch$((config) => config.flowCommand).pipe(skip(1)).subscribe(() => {
      // Restart client
      void this.restart()
    })
  }

  #subscribeToBinaryChanges (): void {
    // Subscribe to changes in the selected binary to restart the client
    // Skip the first value since we don't want to restart the client when it's first initialized
    const subscription = this.#cliProvider.currentBinary$.pipe(skip(1)).subscribe(() => {
      // Restart client
      void this.restart()
    })
    this.#subscriptions.push(subscription)
  }

  async #sendRequest (cmd: string, args: any[] = []): Promise<any> {
    return await this.client?.sendRequest(ExecuteCommandRequest.type, {
      command: cmd,
      arguments: args
    })
  }
}
