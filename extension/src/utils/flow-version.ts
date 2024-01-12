import { execDefault } from './shell/exec'
import { StateCache } from './state-cache'
import * as semver from 'semver'
import * as vscode from 'vscode'

const CHECK_FLOW_CLI_CMD = 'flow version'

async function fetchFlowVersion (): Promise<semver.SemVer | null> {
  try {
    // Get user's version informaton
    const buffer: string = (await execDefault(CHECK_FLOW_CLI_CMD)).stdout

    // Format version string from output
    let versionStr: string | null = extractFlowCLIVersion(buffer)
    if (versionStr == null) return null

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

export function extractFlowCLIVersion (buffer: Buffer | string): string | null {
  const versionRegex = /Version: (0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/
  let versionMatch = versionRegex.exec(buffer.toString())

  if (versionMatch != null) return versionMatch[1]

  // Fallback regex to semver if versionRegex fails (protect against future changes to flow version output)
  const fallbackRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
  versionMatch ??= fallbackRegex.exec(buffer.toString())
  if (versionMatch != null) {
    void vscode.window.showWarningMessage(`Unfamiliar Flow CLI version format. Assuming that version is ${versionMatch[1]}. Please report this issue to the Flow team.`)
    return versionMatch[1]
  }

  return null
}

export const flowVersion = new StateCache(fetchFlowVersion)
