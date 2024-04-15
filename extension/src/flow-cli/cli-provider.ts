import { BehaviorSubject, Observable, distinctUntilChanged, pairwise, startWith } from 'rxjs'
import { StateCache } from '../utils/state-cache'
import * as vscode from 'vscode'
import { Settings } from '../settings/settings'
import { isEqual } from 'lodash'
import { CliBinary, BinaryVersionsProvider } from './binary-versions-provider'

export class CliProvider {
  #selectedBinaryName: BehaviorSubject<string>
  #currentBinary$: StateCache<CliBinary | null>
  #binaryVersions: BinaryVersionsProvider
  #settings: Settings

  constructor (settings: Settings) {
    const initialBinaryPath = settings.getSettings().flowCommand

    this.#settings = settings
    this.#binaryVersions = new BinaryVersionsProvider([initialBinaryPath])
    this.#selectedBinaryName = new BehaviorSubject<string>(initialBinaryPath)
    this.#currentBinary$ = new StateCache(async () => {
      const name: string = this.#selectedBinaryName.getValue()
      const versionCache = this.#binaryVersions.get(name)
      if (versionCache == null) return null
      return await versionCache.getValue()
    })

    // Bind the selected binary to the settings
    this.#settings.watch$(config => config.flowCommand).subscribe((flowCommand) => {
      this.#selectedBinaryName.next(flowCommand)
    })

    // Display warning to user if binary doesn't exist (only if not using the default binary)
    this.currentBinary$.subscribe((binary) => {
      if (binary === null && this.#selectedBinaryName.getValue() !== 'flow') {
        void vscode.window.showErrorMessage(`The configured Flow CLI binary "${this.#selectedBinaryName.getValue()}" does not exist. Please check your settings.`)
      }
    })

    this.#watchForBinaryChanges()
  }

  #watchForBinaryChanges (): void {
    // Subscribe to changes in the selected binary to update the caches
    this.#selectedBinaryName.pipe(distinctUntilChanged(), startWith(null), pairwise()).subscribe(([prev, curr]) => {
      // Remove the previous binary from the cache
      if (prev != null) this.#binaryVersions.remove(prev)

      // Add the current binary to the cache
      if (curr != null) this.#binaryVersions.add(curr)

      // Invalidate the current binary cache
      this.#currentBinary$.invalidate()
    })
  }

  async getCurrentBinary (): Promise<CliBinary | null> {
    return await this.#currentBinary$.getValue()
  }

  async setCurrentBinary (name: string): Promise<void> {
    await this.#settings.updateSettings({ flowCommand: name })
  }

  get currentBinary$ (): Observable<CliBinary | null> {
    return this.#currentBinary$.pipe(distinctUntilChanged(isEqual))
  }

  async getBinaryVersions (): Promise<CliBinary[]> {
    return await this.#binaryVersions.getVersions()
  }

  get binaryVersions$ (): Observable<CliBinary[]> {
    return this.#binaryVersions.versions$.pipe(distinctUntilChanged(isEqual))
  }

  // Refresh all cached binary versions
  refresh (): void {
    this.#binaryVersions.refresh()
  }
}
