/* Installer for Flow CLI */
import { window } from 'vscode'
import { execUnixDefault, execPowerShell, execDefault, execVscodeTerminal } from '../../utils/shell/exec'
import { promptUserInfoMessage, promptUserErrorMessage } from '../../ui/prompts'
import { Installer } from '../installer'
import { execSync } from 'child_process'
import * as semver from 'semver'
import fetch from 'node-fetch'
import { ext } from '../../main'
import { HomebrewInstaller } from './homebrew-installer'

// Command to check flow-cli
const CHECK_FLOW_CLI_CMD = 'flow version'
const COMPATIBLE_FLOW_CLI_VERSIONS = '>=1.2.0'

// Shell install commands
const BREW_INSTALL_FLOW_CLI = 'brew update && brew install flow-cli'
const POWERSHELL_INSTALL_CMD = (githubToken?: string): string =>
  `iex "& { $(irm 'https://raw.githubusercontent.com/onflow/flow-cli/master/install.ps1') } ${
    githubToken != null ? `-GitHubToken ${githubToken} ` : ''
  }"`
const BASH_INSTALL_FLOW_CLI = (githubToken?: string): string =>
  `${
    githubToken != null ? `GITHUB_TOKEN=${githubToken} && ` : ''
  }sh -ci "$(curl -fsSL https://raw.githubusercontent.com/onflow/flow-cli/master/install.sh)"`
const VERSION_INFO_URL = 'https://raw.githubusercontent.com/onflow/flow-cli/master/version.txt'
export class InstallFlowCLI extends Installer {
  #githubToken: string | undefined

  constructor () {
    // Homebrew is a dependency for macos and linux
    const dependencies: Array<new () => Installer> = []
    if (process.platform === 'darwin' || process.platform === 'linux') {
      dependencies.push(HomebrewInstaller)
    }

    super('Flow CLI', dependencies)
    this.#githubToken = process.env.GITHUB_TOKEN
  }

  async install (): Promise<void> {
    const isActive = ext?.emulatorCtrl.api.isActive === true
    if (isActive) await ext?.emulatorCtrl.api.deactivate()
    const OS_TYPE = process.platform

    try {
      switch (OS_TYPE) {
        case 'darwin':
        case 'linux':
          await this.#install_macos()
          break
        case 'win32':
          await this.#install_windows()
          break
        default:
          await this.#install_bash_cmd()
          break
      }
    } catch {
      void window.showErrorMessage('Failed to install Flow CLI')
    }
    if (isActive) await ext?.emulatorCtrl.api.activate()
  }

  async #install_macos (): Promise<void> {
    // Install Flow CLI using homebrew
    await execVscodeTerminal('Install Flow CLI', BREW_INSTALL_FLOW_CLI)
  }

  async #install_windows (): Promise<void> {
    // Retry if bad GH token
    if (this.#githubToken != null && await execPowerShell(POWERSHELL_INSTALL_CMD(this.#githubToken))) { return }
    await execVscodeTerminal('Install Flow CLI', POWERSHELL_INSTALL_CMD(this.#githubToken))
  }

  async #install_bash_cmd (): Promise<void> {
    // Retry if bad GH token
    if (this.#githubToken != null && await execUnixDefault(BASH_INSTALL_FLOW_CLI(this.#githubToken))) { return }
    await execVscodeTerminal('Install Flow CLI', BASH_INSTALL_FLOW_CLI())
  }

  async findLatestVersion (currentVersion: semver.SemVer): Promise<void> {
    const response = await fetch(VERSION_INFO_URL)
    const text = await response.text()

    let latestStr: string | null = parseFlowCliVersion(text)
    latestStr = semver.clean(text)
    const latest: semver.SemVer | null = semver.parse(latestStr)

    // Check if latest version > current version
    if (latest != null && latestStr != null && semver.compare(latest, currentVersion) === 1) {
      promptUserInfoMessage(
        'There is a new Flow CLI version available: ' + latestStr,
        'Install latest Flow CLI',
        () => {
          void this.runInstall()
        }
      )
    }
  }

  async checkVersion (): Promise<boolean> {
    // Get user's version informaton
    const buffer: Buffer = execSync(CHECK_FLOW_CLI_CMD)

    // Format version string from output
    let versionStr: string | null = parseFlowCliVersion(buffer)

    versionStr = semver.clean(versionStr)
    if (versionStr === null) return false

    // Ensure user has a compatible version number installed
    const version: semver.SemVer | null = semver.parse(versionStr)
    if (version === null) return false

    if (!semver.satisfies(version, COMPATIBLE_FLOW_CLI_VERSIONS)) {
      promptUserErrorMessage(
        'Incompatible Flow CLI version: ' + versionStr,
        'Install latest Flow CLI',
        () => {
          void this.runInstall()
        }
      )
      return false
    }

    // Check for newer version
    await this.findLatestVersion(version)

    return true
  }

  async verifyInstall (): Promise<boolean> {
    // Check if flow-cli is executable
    if (!await execDefault(CHECK_FLOW_CLI_CMD)) return false

    // Check flow-cli version number
    return await this.checkVersion()
  }
}

export function parseFlowCliVersion (buffer: Buffer | string): string {
  return (buffer.toString().split('\n')[0]).split(' ')[1]
}
