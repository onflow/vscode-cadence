import { BehaviorSubject, Observable, distinctUntilChanged, pairwise, startWith } from 'rxjs'
import { execDefault } from '../utils/shell/exec'
import { StateCache } from '../utils/state-cache'
import * as semver from 'semver'
import { Settings } from '../settings/settings'

const CHECK_FLOW_CLI_CMD = (flowCommand: string): string => `${flowCommand} version`
const KNOWN_BINS = ['flow', 'flow-c1']

const CADENCE_V1_CLI_REGEX = /-cadence-v1.0.0/g

export type CliBinary = {
  name: string
  version: semver.SemVer
}

type AvailableBinariesCache = {
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
    this.#settings.settings$(config => config.flowCommand).subscribe((flowCommand) => {
      this.#selectedBinaryName.next(flowCommand)
    })

    this.#availableBinaries = KNOWN_BINS.reduce((acc, bin) => {
      acc[bin] = new StateCache(async () => await this.#fetchBinaryInformation(bin))
      acc[bin].subscribe(() => {
        this.#availableBinaries$.invalidate()
      })
      return acc
    }, {} as AvailableBinariesCache)

    this.#availableBinaries$ = new StateCache(async () => {
      return this.getAvailableBinaries()
    })

    this.#currentBinary$ = new StateCache(async () => {
      const name: string = this.#selectedBinaryName.getValue()
      return this.#availableBinaries[name].getValue()
    })

    // Subscribe to changes in the selected binary to update the caches
    this.#selectedBinaryName.pipe(distinctUntilChanged(), startWith(null), pairwise()).subscribe(([prev, curr]) => {
      // Swap out the cache for the selected binary
      if (prev != null && !KNOWN_BINS.includes(prev)) {
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

  async #fetchBinaryInformation (bin: string): Promise<CliBinary | null> {
    try {
      // Get user's version informaton
      const buffer: string = (await execDefault(CHECK_FLOW_CLI_CMD(
        bin
      ))).stdout

      // Format version string from output
      let versionStr: string | null = parseFlowCliVersion(buffer)

      versionStr = semver.clean(versionStr)
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
    })
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
    return this.#currentBinary$
  }

  async getCurrentBinary (): Promise<CliBinary | null> {
    return this.#currentBinary$.getValue()
  }

  setCurrentBinary (name: string): void {
    this.#settings.updateSettings({ flowCommand: name })
  }
}

export function isCadenceV1Cli (version: semver.SemVer): boolean {
    return CADENCE_V1_CLI_REGEX.test(version.raw)
}

export function parseFlowCliVersion (buffer: Buffer | string): string {
  return (buffer.toString().split('\n')[0]).split(' ')[1]
}
