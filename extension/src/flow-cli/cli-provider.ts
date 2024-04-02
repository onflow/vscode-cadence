import { BehaviorSubject, Observable, distinctUntilChanged, pairwise, startWith } from 'rxjs'
import { execDefault } from '../utils/shell/exec'
import { StateCache } from '../utils/state-cache'
import * as semver from 'semver'
import * as vscode from 'vscode'
import { Settings } from '../settings/settings'
import { isEqual } from 'lodash'

const CHECK_FLOW_CLI_CMD = (flowCommand: string): string => `${flowCommand} version --output=json`
const CHECK_FLOW_CLI_CMD_NO_JSON = (flowCommand: string): string => `${flowCommand} version`

const KNOWN_BINS = ['flow', 'flow-c1']

const CADENCE_V1_CLI_REGEX = /-cadence-v1.0.0/g
const LEGACY_VERSION_REGEXP = /Version:\s*(v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)\s/m

export interface CliBinary {
  name: string
  version: semver.SemVer
}

interface FlowVersionOutput {
  version: string
}

interface AvailableBinariesCache {
  [key: string]: StateCache<CliBinary | null>
}

export class CliProvider {
  #selectedBinaryName: BehaviorSubject<string>
  #currentBinary$: StateCache<CliBinary | null>
  #availableBinaries: AvailableBinariesCache = {}
  #availableBinaries$: StateCache<CliBinary[]>
  #settings: Settings

  constructor (settings: Settings) {
    this.#settings = settings

    this.#selectedBinaryName = new BehaviorSubject<string>(settings.getSettings().flowCommand)
    this.#settings.watch$(config => config.flowCommand).subscribe((flowCommand) => {
      this.#selectedBinaryName.next(flowCommand)
    })

    this.#availableBinaries = KNOWN_BINS.reduce<AvailableBinariesCache>((acc, bin) => {
      acc[bin] = new StateCache(async () => await this.#fetchBinaryInformation(bin))
      acc[bin].subscribe(() => {
        this.#availableBinaries$.invalidate()
      })
      return acc
    }, {})

    this.#availableBinaries$ = new StateCache(async () => {
      return await this.getAvailableBinaries()
    })

    this.#currentBinary$ = new StateCache(async () => {
      const name: string = this.#selectedBinaryName.getValue()
      return await this.#availableBinaries[name].getValue()
    })

    // Display warning to user if binary doesn't exist (only if not using the default binary)
    this.#currentBinary$.subscribe((binary) => {
      if (binary === null && this.#selectedBinaryName.getValue() !== 'flow') {
        void vscode.window.showErrorMessage(`The configured Flow CLI binary "${this.#selectedBinaryName.getValue()}" does not exist. Please check your settings.`)
      }
    })

    this.#watchForBinaryChanges()
  }

  #watchForBinaryChanges (): void {
    // Subscribe to changes in the selected binary to update the caches
    this.#selectedBinaryName.pipe(distinctUntilChanged(), startWith(null), pairwise()).subscribe(([prev, curr]) => {
      // Swap out the cache for the selected binary
      if (prev != null && !KNOWN_BINS.includes(prev)) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.#availableBinaries[prev]
      }
      if (curr != null && !KNOWN_BINS.includes(curr)) {
        this.#availableBinaries[curr] = new StateCache(async () => await this.#fetchBinaryInformation(curr))
        this.#availableBinaries[curr].subscribe(() => {
          this.#availableBinaries$.invalidate()
        })
      }

      // Invalidate the current binary cache
      this.#currentBinary$.invalidate()

      // Invalidate the available binaries cache
      this.#availableBinaries$.invalidate()
    })
  }

  // Fetches the binary information for the given binary
  async #fetchBinaryInformation (bin: string): Promise<CliBinary | null> {
    try {
      // Get user's version informaton
      const buffer: string = (await execDefault(CHECK_FLOW_CLI_CMD(
        bin
      ))).stdout

      // Format version string from output
      const versionInfo: FlowVersionOutput = JSON.parse(buffer)

      // Ensure user has a compatible version number installed
      const version: semver.SemVer | null = semver.parse(versionInfo.version)
      if (version === null) return null

      return { name: bin, version }
    } catch {
      // Fallback to old method if JSON is not supported/fails
      return await this.#fetchBinaryInformationOld(bin)
    }
  }

  // Old version of fetchBinaryInformation (before JSON was supported)
  // Used as fallback for old CLI versions
  async #fetchBinaryInformationOld (bin: string): Promise<CliBinary | null> {
    try {
      // Get user's version informaton
      const output = (await execDefault(CHECK_FLOW_CLI_CMD_NO_JSON(
        bin
      )))

      let versionStr: string | null = parseFlowCliVersion(output.stdout)
      if (versionStr === null) {
        // Try to fallback to stderr as patch for bugged version
        versionStr = parseFlowCliVersion(output.stderr)
      }

      versionStr = versionStr != null ? semver.clean(versionStr) : null
      if (versionStr === null) return null

      // Ensure user has a compatible version number installed
      const version: semver.SemVer | null = semver.parse(versionStr)
      if (version === null) return null

      return { name: bin, version }
    } catch {
      return null
    }
  }

  refresh (): void {
    for (const bin in this.#availableBinaries) {
      this.#availableBinaries[bin].invalidate()
    }
    this.#currentBinary$.invalidate()
  }

  get availableBinaries$ (): Observable<CliBinary[]> {
    return new Observable((subscriber) => {
      this.#availableBinaries$.subscribe((binaries) => {
        subscriber.next(binaries)
      })
    }).pipe(distinctUntilChanged(isEqual))
  }

  async getAvailableBinaries (): Promise<CliBinary[]> {
    const bins: CliBinary[] = []
    for (const name in this.#availableBinaries) {
      const binary = await this.#availableBinaries[name].getValue().catch(() => null)
      if (binary !== null) {
        bins.push(binary)
      }
    }
    return bins
  }

  get currentBinary$ (): Observable<CliBinary | null> {
    return this.#currentBinary$.pipe(distinctUntilChanged(isEqual))
  }

  async getCurrentBinary (): Promise<CliBinary | null> {
    return await this.#currentBinary$.getValue()
  }

  async setCurrentBinary (name: string): Promise<void> {
    await this.#settings.updateSettings({ flowCommand: name })
  }
}

export function isCadenceV1Cli (version: semver.SemVer): boolean {
  return CADENCE_V1_CLI_REGEX.test(version.raw)
}

export function parseFlowCliVersion (buffer: Buffer | string): string | null {
  return buffer.toString().match(LEGACY_VERSION_REGEXP)?.[1] ?? null
}
