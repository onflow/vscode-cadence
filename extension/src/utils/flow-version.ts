import { execDefault } from './shell/exec'
import { StateCache } from './state-cache'
import * as semver from 'semver'

const CHECK_FLOW_CLI_CMD = 'flow version'

async function fetchFlowVersion (): Promise<semver.SemVer | null> {
  try {
    // Get user's version informaton
    const buffer: string = (await execDefault(CHECK_FLOW_CLI_CMD)).stdout

    // Format version string from output
    let versionStr: string | null = parseFlowCliVersion(buffer)

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

export function parseFlowCliVersion (buffer: Buffer | string): string {
  return (buffer.toString().split('\n')[0]).split(' ')[1]
}

export const flowVersion = new StateCache(fetchFlowVersion)
