import * as semver from 'semver'
import { StateCache } from '../utils/state-cache'
import { execDefault } from '../utils/shell/exec'
import { Observable, distinctUntilChanged } from 'rxjs'
import { isEqual } from 'lodash'

const CHECK_FLOW_CLI_CMD = (flowCommand: string): string => `${flowCommand} version --output=json`
const CHECK_FLOW_CLI_CMD_NO_JSON = (flowCommand: string): string => `${flowCommand} version`

export enum KNOWN_FLOW_COMMANDS {
  DEFAULT = 'flow',
  CADENCE_V1 = 'flow-c1',
}

const LEGACY_VERSION_REGEXP = /Version:\s*(v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)(\s|$)/m

export interface CliBinary {
  command: string
  version: semver.SemVer
}

interface FlowVersionOutput {
  version: string
}

export class BinaryVersionsProvider {
  #rootCache: StateCache<CliBinary[]>
  #caches: { [key: string]: StateCache<CliBinary | null> } = {}

  constructor (seedBinaries: string[] = []) {
    // Seed the caches with the known binaries
    Object.values(KNOWN_FLOW_COMMANDS).forEach((bin) => {
      this.add(bin)
    })

    // Seed the caches with any additional binaries
    seedBinaries.forEach((bin) => {
      this.add(bin)
    })

    // Create the root cache. This cache will hold all the binary information
    // and is a combination of all the individual caches for each binary
    this.#rootCache = new StateCache(async () => {
      const binaries = await Promise.all(
        Object.keys(this.#caches).map(async (bin) => {
          return await this.#caches[bin].getValue().catch(() => null)
        })
      )

      // Filter out missing binaries
      return binaries.filter((bin) => bin != null) as CliBinary[]
    })
  }

  add (path: string): void {
    if (this.#caches[path] != null) return
    this.#caches[path] = new StateCache(async () => await this.#fetchBinaryInformation(path))
    this.#caches[path].subscribe(() => {
      this.#rootCache?.invalidate()
    })
    this.#rootCache?.invalidate()
  }

  remove (path: string): void {
    // Known binaries cannot be removed
    if (this.#caches[path] == null || (Object.values(KNOWN_FLOW_COMMANDS) as string[]).includes(path)) return
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.#caches[path]
    this.#rootCache?.invalidate()
  }

  get (name: string): StateCache<CliBinary | null> | null {
    return this.#caches[name] ?? null
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

      return { command: bin, version }
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

      return { command: bin, version }
    } catch {
      return null
    }
  }

  refresh (): void {
    Object.keys(this.#caches).forEach((bin) => {
      this.#caches[bin].invalidate()
    })
    this.#rootCache.invalidate()
  }

  async getVersions (): Promise<CliBinary[]> {
    return await this.#rootCache.getValue()
  }

  get versions$ (): Observable<CliBinary[]> {
    return this.#rootCache.pipe(distinctUntilChanged(isEqual))
  }
}

export function parseFlowCliVersion (buffer: Buffer | string): string | null {
  return buffer.toString().match(LEGACY_VERSION_REGEXP)?.[1] ?? null
}
