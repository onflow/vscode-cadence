/* Installer for Flow CLI */
import { window } from 'vscode'
import { INSTALL_FLOW_CLI_HOMEBREW, INSTALL_HOMEBREW } from '../strings'
import { execDefault, execPowerShell } from '../utils'
import { Installer } from './installer'

// Command to check flow-cli
const CHECK_FLOW_CLI_CMD = 'flow'

// Flow CLI with homebrew
const CHECK_HOMEBREW_CMD = 'brew help help' // Run this to check if brew is executable
const BASH_INSTALL_HOMEBREW = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'

// Shell install commands
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
      window.showInformationMessage(
        'Please install Homebrew to allow for the installation of Flow CLI',
        INSTALL_HOMEBREW
      ).then((choice) => {
        if (choice === INSTALL_HOMEBREW) {
          this.#installHomebrew()
        }
      }, () => {})
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
      window.showInformationMessage(
        'Install Flow CLI using Homebrew',
        INSTALL_FLOW_CLI_HOMEBREW
      ).then((choice) => {
        if (choice === INSTALL_FLOW_CLI_HOMEBREW) {
          void execDefault(BREW_INSTALL_FLOW_CLI)
        }
      }, () => {})
    } else {
      // Install Flow CLI using homebrew
      void window.showInformationMessage('Installing Flow CLI')
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

  verifyInstall (): boolean {
    // Check if flow-cli is executable
    return execDefault(CHECK_FLOW_CLI_CMD)
  }
}
