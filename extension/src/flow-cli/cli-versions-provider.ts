import * as semver from 'semver'
import { StateCache } from '../utils/state-cache'
import { execDefault } from '../utils/shell/exec'
import { Observable, distinctUntilChanged } from 'rxjs'
import { isEqual } from 'lodash'

const CHECK_FLOW_CLI_CMD = (flowCommand: string): string => `${flowCommand} version -v --output=json`
const FLOWKIT_PACKAGE_NAME = 'github.com/onflow/flowkit/v2'

export enum KNOWN_FLOW_COMMANDS {
  DEFAULT = 'flow',
}

export interface CliBinary {
  command: string
  version: semver.SemVer
  flowkitVersion: semver.SemVer
}

interface FlowVersionOutput {
  version: string
  dependencies?: Array<{
    package: string
    version: string
  }>
}

export class CliVersionsProvider {
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

      // Filter out missing binaries using a type guard to narrow type
      return binaries.filter((bin): bin is CliBinary => bin != null)
    })
  }

  add (command: string): void {
    if (this.#caches[command] != null) return
    this.#caches[command] = new StateCache(async () => await this.#fetchBinaryInformation(command))
    this.#caches[command].subscribe(() => {
      this.#rootCache?.invalidate()
    })
    this.#rootCache?.invalidate()
  }

  remove (command: string): void {
    // Known binaries cannot be removed
    if (this.#caches[command] == null || (Object.values(KNOWN_FLOW_COMMANDS) as string[]).includes(command)) return
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.#caches[command]
    this.#rootCache?.invalidate()
  }

  get (name: string): StateCache<CliBinary | null> | null {
    return this.#caches[name] ?? null
  }

  // Fetches the binary information for the given binary
  async #fetchBinaryInformation (bin: string): Promise<CliBinary | null> {
    try {
      // Get user's version information
      const buffer: string = (await execDefault(CHECK_FLOW_CLI_CMD(
        bin
      ))).stdout

      // Format version string from output
      const versionInfo: FlowVersionOutput = JSON.parse(buffer)

      // Extract flowkit version from dependencies
      const flowkitDep = versionInfo.dependencies?.find(dep =>
        dep.package === FLOWKIT_PACKAGE_NAME
      )
      const flowkitVersionStr = flowkitDep?.version

      return cliBinaryFromVersion(bin, versionInfo.version, flowkitVersionStr)
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

function cliBinaryFromVersion (bin: string, versionStr: string, flowkitVersionStr?: string): CliBinary | null {
  // Ensure user has a compatible version number installed
  const version: semver.SemVer | null = semver.parse(versionStr)
  if (version === null) return null

  // Parse flowkit version - both CLI and flowkit versions are required
  if (flowkitVersionStr == null) return null
  const flowkitVersion: semver.SemVer | null = semver.parse(flowkitVersionStr)
  if (flowkitVersion === null) return null

  return { command: bin, version, flowkitVersion }
}
