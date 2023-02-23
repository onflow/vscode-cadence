/* Installer for Flow CLI */
import { window } from 'vscode'
import { execDefault, execPowerShell } from '../../utils/utils'
import { promptUserInfoMessage, promptUserErrorMessage } from '../../ui/prompts'
import { Installer } from '../installer'
import { execSync } from 'child_process'
import { parseFlowCliVersion } from './version-parsers'
import * as semver from 'semver'
import fetch from 'node-fetch'

// Command to check flow-cli
const CHECK_FLOW_CLI_CMD = 'flow version'
const COMPATIBLE_FLOW_CLI_VERSIONS = '>=0.45.4'

// Flow CLI with homebrew
const CHECK_HOMEBREW_CMD = 'brew help help' // Run this to check if brew is executable
const BASH_INSTALL_HOMEBREW = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'

// Shell install commands
const BREW_UPDATE = 'brew update'
const BREW_INSTALL_FLOW_CLI = 'brew install flow-cli'
const POWERSHELL_INSTALL_CMD = 'iex "& { $(irm \'https://raw.githubusercontent.com/onflow/flow-cli/master/install.ps1\') }"'
const BASH_INSTALL_FLOW_CLI = 'sh -ci "$(curl -fsSL https://raw.githubusercontent.com/onflow/flow-cli/master/install.sh)"'

const VERSION_INFO_URL = 'https://raw.githubusercontent.com/onflow/flow-cli/master/version.txt'

export class InstallFlowCLI extends Installer {
  constructor () {
    super('Flow CLI')
  }

  install (): void {
    const OS_TYPE = process.platform
    switch (OS_TYPE) {
      case 'darwin':
      case 'linux':
        this.#install_macos()
        break
      case 'win32':
        this.#install_windows()
        break
      default:
        this.#install_bash_cmd()
        break
    }
  }

  #install_macos (): void {
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
  }

  #installHomebrew (): void {
    // Help user install homebrew in a terminal
    const term = window.createTerminal({
      name: 'Install Homebrew',
      hideFromUser: true
    })
    term.sendText(BASH_INSTALL_HOMEBREW)
    term.show()
    this.#brewInstallFlowCLI(true)
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

  #install_windows (): void {
    execPowerShell(POWERSHELL_INSTALL_CMD)
  }

  #install_bash_cmd (): void {
    execDefault(BASH_INSTALL_FLOW_CLI)
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
        () => {
          void window.showInformationMessage('Running Flow CLI installer, please wait...')
          this.install()
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
        () => {
          void window.showInformationMessage('Running Flow CLI installer, please wait...')
          this.install()
          if (!this.verifyInstall()) {
            void window.showErrorMessage('Failed to install Flow CLI')
            return
          }
          void window.showInformationMessage('Flow CLI installed sucessfully. ' +
          'You may need to reload the extension.')
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
