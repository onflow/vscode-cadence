/* Installer for Flow CLI */
import { window } from 'vscode'
import { execDefault, execPowerShell, restartVscode } from '../../utils/utils'
import { promptUserInfoMessage, promptUserErrorMessage } from '../../ui/prompts'
import { Installer } from '../installer'
import { execSync } from 'child_process'
import * as semver from 'semver'
import fetch from 'node-fetch'
import { ext } from '../../main'

// Command to check flow-cli
let CHECK_FLOW_CLI_CMD = 'flow version'
const COMPATIBLE_FLOW_CLI_VERSIONS = '>=0.45.4'

// Flow CLI with homebrew
const CHECK_HOMEBREW_CMD = 'brew help help' // Run this to check if brew is executable
const BASH_INSTALL_HOMEBREW = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'

// Shell install commands
const BREW_UPDATE = 'brew update'
const BREW_INSTALL_FLOW_CLI = 'brew install flow-cli'
const POWERSHELL_INSTALL_CMD = (githubToken?: string): string =>
  `iex "& { $(irm 'https://raw.githubusercontent.com/onflow/flow-cli/master/install.ps1') } ${
    githubToken != null ? `-GitHubToken ${githubToken} ` : ''
  }"`
const BASH_INSTALL_FLOW_CLI = (githubToken?: string): string =>
  `(${
    githubToken != null ? `export GITHUB_TOKEN=${githubToken} && ` : ''
  }sh -ci "$(curl -fsSL https://raw.githubusercontent.com/onflow/flow-cli/master/install.sh))`
const VERSION_INFO_URL = 'https://raw.githubusercontent.com/onflow/flow-cli/master/version.txt'
export class InstallFlowCLI extends Installer {
  #githubToken: string | undefined

  constructor () {
    super('Flow CLI')
    this.#githubToken = process.env.GITHUB_TOKEN
  }

  async install(): Promise<void> {
    const isActive = ext?.emulatorCtrl.api.isActive
    if (isActive) await ext?.emulatorCtrl.api.deactivate()
    const OS_TYPE = process.platform
    let installationResult: boolean
    switch (OS_TYPE) {
      case 'darwin':
      case 'linux':
        installationResult = await this.#install_macos()
        break
      case 'win32':
        installationResult = this.#install_windows()
        break
      default:
        installationResult = this.#install_bash_cmd()
        break
    }
    if (isActive) await ext?.emulatorCtrl.api.activate()
    
    promptUserErrorMessage(
      'All dependencies installed successfully.  You may need to restart VSCode.',
      'Restart VSCode',
      restartVscode
    )
  }

  async #install_macos (): Promise<boolean> {
    if (!this.#checkHomebrew()) {
      // Prompt install Homebrew
      promptUserInfoMessage(
        'Please install Homebrew to allow for the installation of Flow CLI',
        'Install Hombrew in terminal',
        () => { this.#installHomebrew() }
      )
    } else {
      this.#brewInstallFlowCLI()
    }

    return true
  }

  #installHomebrew (): boolean {
    // Help user install homebrew in a terminal
    const term = window.createTerminal({
      name: 'Install Homebrew',
      hideFromUser: true
    })
    term.sendText(BASH_INSTALL_HOMEBREW)
    term.show()
    this.#brewInstallFlowCLI(true)
    return true
    //TODO: PLACEHOLDER
  }

  #brewInstallFlowCLI (prompt: boolean = false): void {
    if (prompt) {
      // Prompt install Flow CLI using homebrew
      promptUserInfoMessage(
        'Install Flow CLI using Homebrew',
        'Install Flow CLI',
        () => {
          void execDefault(BREW_UPDATE)
          void execDefault(BREW_INSTALL_FLOW_CLI)
        }
      )
    } else {
      // Install Flow CLI using homebrew
      void window.showInformationMessage('Installing Flow CLI')
      void execDefault(BREW_UPDATE)
      void execDefault(BREW_INSTALL_FLOW_CLI)
    }
  }

  #install_windows (): boolean {
    // Retry if bad GH token
    if (this.#githubToken != null && execPowerShell(POWERSHELL_INSTALL_CMD(this.#githubToken))) { return true }
    return execPowerShell(POWERSHELL_INSTALL_CMD())
  }

  #install_bash_cmd (): boolean {
    // Retry if bad GH token
    if (this.#githubToken != null && execDefault(BASH_INSTALL_FLOW_CLI(this.#githubToken))) { return true }
    return execDefault(BASH_INSTALL_FLOW_CLI())
  }

  #checkHomebrew (): boolean {
    return execDefault(CHECK_HOMEBREW_CMD)
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
        async () => {
          void window.showInformationMessage('Running Flow CLI installer, please wait...')
          await this.install()
          if (!this.verifyInstall()) {
            void window.showErrorMessage('Failed to install Flow CLI')
            return
          }
          void window.showInformationMessage('Flow CLI installed sucessfully. ' +
          'You may need to reload the extension.')
        }
      )
    }
  }

  checkVersion (): boolean {
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
        async () => {
          void window.showInformationMessage('Running Flow CLI installer, please wait...')

          this.install()
        }
      )
      return false
    }

    // Check for newer version
    void this.findLatestVersion(version)

    return true
  }

  verifyInstall (): boolean {
    // Check if flow-cli is executable
    if (!execDefault(CHECK_FLOW_CLI_CMD)) return false

    // Check flow-cli version number
    return this.checkVersion()
  }
}

export function parseFlowCliVersion (buffer: Buffer | string): string {
  return (buffer.toString().split('\n')[0]).split(' ')[1]
}
