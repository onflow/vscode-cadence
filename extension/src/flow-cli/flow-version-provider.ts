import { Settings } from '../settings/settings'
import { execDefault } from '../utils/shell/exec'
import { StateCache } from '../utils/state-cache'
import * as semver from 'semver'

const CHECK_FLOW_CLI_CMD = (flowCommand: string): string => `${flowCommand} version`

export class FlowVersionProvider {
  #settings: Settings
  #stateCache: StateCache<semver.SemVer | null>
  #parseCliVersion: (buffer: Buffer | string) => string

  constructor (settings: Settings, parseCliVersion: (buffer: Buffer | string) => string = parseFlowCliVersion) {
    this.#stateCache = new StateCache<semver.SemVer | null>(async () => await this.#fetchFlowVersion())
    this.#settings = settings
    this.#parseCliVersion = parseCliVersion
  }

  async #fetchFlowVersion (): Promise<semver.SemVer | null> {
    try {
      // Get user's version informaton
      const buffer: string = (await execDefault(CHECK_FLOW_CLI_CMD(
        this.#settings.getSettings().flowCommand
      ))).stdout

      // Format version string from output
      let versionStr: string | null = this.#parseCliVersion(buffer)

      versionStr = semver.clean(versionStr)
      if (versionStr === null) return null

      // Ensure user has a compatible version number installed
      const version: semver.SemVer | null = semver.parse(versionStr)
      if (version === null) return null

      return version
    } catch {
      return null
    }
  }

  refresh (): void {
    this.#stateCache.invalidate()
  }

  async getVersion (): Promise<semver.SemVer | null> {
    return await this.#stateCache.getValue()
  }

  get state$ (): StateCache<semver.SemVer | null> {
    return this.#stateCache
  }
}

export function parseFlowCliVersion (buffer: Buffer | string): string {
  return (buffer.toString().split('\n')[0]).split(' ')[1]
}

