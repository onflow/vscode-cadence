import { LanguageClient, State } from 'vscode-languageclient/node'
import { window } from 'vscode'
import * as Config from '../local/flowConfig'
import { Settings } from '../../settings/settings'
import { exec } from 'child_process'
import { Disposable, ExecuteCommandRequest } from 'vscode-languageclient'
import { BehaviorSubject, Subscription, filter, firstValueFrom } from 'rxjs'
import { envVars } from '../../utils/shell/env-vars'

// Identities for commands handled by the Language server
const RELOAD_CONFIGURATION = 'cadence.server.flow.reloadConfiguration'
export class LanguageServerAPI {
  client: LanguageClient | null = null
  settings: Settings

  clientState$ = new BehaviorSubject<State>(State.Stopped)

  #watcherTimeout: NodeJS.Timeout | null = null
  #watcherPromise: Promise<void> | null = null
  #flowConfigWatcher: Promise<Disposable> | null = null
  #workspaceSettingsSubscriber: Subscription | null = null

  constructor (settings: Settings) {
    this.settings = settings
  }

  async activate (): Promise<void> {
    await this.deactivate()
    await this.startClient()
    await this.watchFlowConfiguration()
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

      const accessCheckMode: string = this.settings.accessCheckMode
      let configPath = this.settings.customConfigPath

      if (configPath === '' || configPath === undefined) {
        configPath = await Config.getConfigPath()
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

  async #sendRequest (cmd: string, args: any[] = []): Promise<any> {
    return await this.client?.sendRequest(ExecuteCommandRequest.type, {
      command: cmd,
      arguments: args
    })
  }


  // Watch and reload flow configuration when changed.
  async watchFlowConfiguration (): Promise<void> {
    // Configure subscriber to reset watcher on flow configuration change
    this.#workspaceSettingsSubscriber?.unsubscribe()
    this.#workspaceSettingsSubscriber = this.settings.didChange$.subscribe(() => {
      Config.flowConfig.invalidate()
      void this.watchFlowConfiguration()
    })

    // Dispose of existing watcher
    ;(await this.#flowConfigWatcher)?.dispose()

    // Watch for changes to flow configuration
    this.#flowConfigWatcher = Config.watchFlowConfigChanges(async () => {
      Config.flowConfig.invalidate()

      // Reload configuration
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
}
