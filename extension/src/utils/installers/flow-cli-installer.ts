/* Installer for Flow CLI */
import { window } from 'vscode'
import { VISIT_HOMEBREW_WEBSITE } from '../strings'
import { execDefault, execPowerShell } from '../utils'
import { Installer } from './installer'
import open = require('open')

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
    // Install Flow CLI using homebrew
    if (!this.#checkHomebrew()) {
      this.#installHomebrew()
      if (!this.#checkHomebrew()) {
        // Failed to install homebrew
        window.showErrorMessage(
          'Please install Homebrew so Flow CLI can be installed',
          VISIT_HOMEBREW_WEBSITE
        ).then((choice) => {
          if (choice === VISIT_HOMEBREW_WEBSITE) {
            void open('https://docs.brew.sh/Installation')
          }
        }, () => {})
        return
      }
    }

    void execDefault(BREW_INSTALL_FLOW_CLI)
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

  #installHomebrew (): void {
    execDefault(BASH_INSTALL_HOMEBREW)
  }

  verifyInstall (): boolean {
    // Check if flow-cli is executable
    return execDefault(CHECK_FLOW_CLI_CMD)
  }
}
