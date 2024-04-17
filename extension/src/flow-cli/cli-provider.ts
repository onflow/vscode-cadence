import { BehaviorSubject, Observable, distinctUntilChanged, pairwise, startWith } from 'rxjs'
import { StateCache } from '../utils/state-cache'
import * as vscode from 'vscode'
import { Settings } from '../settings/settings'
import { isEqual } from 'lodash'
import { CliBinary, CliVersionsProvider, KNOWN_FLOW_COMMANDS } from './cli-versions-provider'

export class CliProvider {
  #selectedBinaryName: BehaviorSubject<string>
  #currentBinary$: StateCache<CliBinary | null>
  #cliVersionsProvider: CliVersionsProvider
  #settings: Settings

  constructor (settings: Settings) {
    const initialBinaryPath = settings.getSettings().flowCommand

    this.#settings = settings
    this.#cliVersionsProvider = new CliVersionsProvider([initialBinaryPath])
    this.#selectedBinaryName = new BehaviorSubject<string>(initialBinaryPath)
    this.#currentBinary$ = new StateCache(async () => {
      const name: string = this.#selectedBinaryName.getValue()
      const versionCache = this.#cliVersionsProvider.get(name)
      if (versionCache == null) return null
      return await versionCache.getValue()
    })

    // Bind the selected binary to the settings
    this.#settings.watch$(config => config.flowCommand).subscribe((flowCommand) => {
      this.#selectedBinaryName.next(flowCommand)
    })

    // Display warning to user if binary doesn't exist (only if not using the default binary)
    this.currentBinary$.subscribe((binary) => {
      if (binary === null && this.#selectedBinaryName.getValue() !== KNOWN_FLOW_COMMANDS.DEFAULT) {
        void vscode.window.showErrorMessage(`The configured Flow CLI binary "${this.#selectedBinaryName.getValue()}" does not exist. Please check your settings.`)
      }
    })

    this.#watchForBinaryChanges()
  }

  #watchForBinaryChanges (): void {
    // Subscribe to changes in the selected binary to update the caches
    this.#selectedBinaryName.pipe(distinctUntilChanged(), startWith(null), pairwise()).subscribe(([prev, curr]) => {
      // Remove the previous binary from the cache
      if (prev != null) this.#cliVersionsProvider.remove(prev)

      // Add the current binary to the cache
      if (curr != null) this.#cliVersionsProvider.add(curr)

      // Invalidate the current binary cache
      this.#currentBinary$.invalidate()
    })
  }

  async getCurrentBinary (): Promise<CliBinary | null> {
    return await this.#currentBinary$.getValue()
  }

  async setCurrentBinary (name: string): Promise<void> {
    if (vscode.workspace.workspaceFolders == null) {
      await this.#settings.updateSettings({ flowCommand: name }, vscode.ConfigurationTarget.Global)
    } else {
      await this.#settings.updateSettings({ flowCommand: name })
    }
  }

  get currentBinary$ (): Observable<CliBinary | null> {
    return this.#currentBinary$.pipe(distinctUntilChanged(isEqual))
  }

  async getBinaryVersions (): Promise<CliBinary[]> {
    return await this.#cliVersionsProvider.getVersions()
  }

  get binaryVersions$ (): Observable<CliBinary[]> {
    return this.#cliVersionsProvider.versions$.pipe(distinctUntilChanged(isEqual))
  }

  // Refresh all cached binary versions
  refresh (): void {
    this.#cliVersionsProvider.refresh()
  }
}
