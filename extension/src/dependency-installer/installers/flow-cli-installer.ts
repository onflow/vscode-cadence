/* Installer for Flow CLI */
import { window } from 'vscode'
import { execDefault, execPowerShell } from '../../utils/utils'
import { promptUserInfoMessage } from '../../ui/prompts'
import { Installer } from '../installer'
import { checkHomebrew } from './homebrew-installer'
import { ext } from '../../main'

// Command to check flow-cli
const CHECK_FLOW_CLI_CMD = 'flow'

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
    if (!checkHomebrew()) {
      window.showInformationMessage('Please install Homebrew to allow for the installation of Flow CLI')
      ext.checkDependencies()
    } else {
      this.#brewInstallFlowCLI()
    }
  }

  #brewInstallFlowCLI (prompt: boolean = false): void {
    if (prompt) {
      // Prompt install Flow CLI using homebrew
      promptUserInfoMessage(
        'Install Flow CLI using Homebrew',
        'Install Flow CLI',
        () => { void execDefault(BREW_INSTALL_FLOW_CLI) }
      )
    } else {
      // Install Flow CLI using homebrew
      void execDefault(BREW_INSTALL_FLOW_CLI)
    }
  }

  #install_windows (): void {
    execPowerShell(WINDOWS_POWERSHELL_INSTALL_CMD)
  }

  #install_bash_cmd (): void {
    execDefault(BASH_INSTALL_FLOW_CLI)
  }

  verifyInstall (): boolean {
    // Check if flow-cli is executable
    return execDefault(CHECK_FLOW_CLI_CMD)
  }
}
