/* Installer for Flow CLI */
import { window } from 'vscode'
import { execDefault, execPowerShell } from '../../utils/utils'
import { promptUserInfoMessage, promptUserErrorMessage } from '../../ui/prompts'
import { Installer } from '../installer'
import { execSync } from 'child_process'
import { parseFlowCliVersion } from './version-parsers'
import * as semver from 'semver'

// Command to check flow-cli
const CHECK_FLOW_CLI_CMD = 'flow version'
const COMPATIBLE_FLOW_CLI_VERSIONS = '>=0.40.0'

// Flow CLI with homebrew
const CHECK_HOMEBREW_CMD = 'brew help help' // Run this to check if brew is executable
const BASH_INSTALL_HOMEBREW = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'

// Shell install commands
const BREW_UPDATE = 'brew update'
const BREW_INSTALL_FLOW_CLI = 'brew install flow-cli'
const WINDOWS_POWERSHELL_INSTALL_CMD = 'iex "& { $(irm \'https://storage.googleapis.com/flow-cli/install.ps1\') }"'
const BASH_INSTALL_FLOW_CLI = 'sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"'

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
    execPowerShell(WINDOWS_POWERSHELL_INSTALL_CMD)
  }

  #install_bash_cmd (): void {
    execDefault(BASH_INSTALL_FLOW_CLI)
  }

  #checkHomebrew (): boolean {
    return execDefault(CHECK_HOMEBREW_CMD)
  }

  checkVersion (): boolean {
    // Get version informaton
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
          window.withProgress()
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
    return true
  }

  verifyInstall (): boolean {
    // Check if flow-cli is executable
    if (!execDefault(CHECK_FLOW_CLI_CMD)) return false

    // Check flow-cli version number
    return this.checkVersion()
  }
}
