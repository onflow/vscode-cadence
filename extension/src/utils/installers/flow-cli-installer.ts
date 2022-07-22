import { DEBUG_LOG } from '../debug'
import { Installer } from './installer'

// Command to check flow-cli
const CHECK_FLOW_CLI_CMD = 'flow'

// Flow CLI with homebrew
const CHECK_HOMEBREW_CMD = 'brew help help' // Run this to check if brew is executable
const BASH_INSTALL_HOMEBREW = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'

// Shell install commands
const BREW_INSTALL_FLOW_CLI = 'brew install flow-cli'
const WINDOWS_POWERSHELL_INSTALL_CMD = 'iex \"& { $(irm \'https://storage.googleapis.com/flow-cli/install.ps1\') }\"'
const BASH_INSTALL_FLOW_CLI = 'sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"'

export class InstallFlowCLI extends Installer {
  constructor () {
    super('Flow CLI')
  }

  install (): void {
    DEBUG_LOG('Running Flow CLI Installer...')

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

    /* // TODO: Do I need this? Probably? lol.
    const CPU_TYPE = process.arch
    switch (CPU_TYPE) {
      case 'x86_64':
      case 'x86-64':
      case 'x64':
      case 'amd64':
        this.#install_x64()
        break
      case 'arm':
      case 'arm64':
        this.#install_arm()
        break
      default:
      // Unknown CPU Type
    }
    */
  }

  #install_macos (): void {
    // Install Flow CLI using homebrew
    if (!this.#checkHomebrew()) {
      this.#installHomebrew()
      if (!this.#checkHomebrew()) {
        // Failed to install homebrew
        return
      }
    }

    void this.execBash(BREW_INSTALL_FLOW_CLI)
  }

  #install_windows (): void {
    this.execPowerShell(WINDOWS_POWERSHELL_INSTALL_CMD)
  }

  #install_bash_cmd (): void {
    this.execBash(BASH_INSTALL_FLOW_CLI)
  }

  #checkHomebrew (): boolean {
    return this.execBash(CHECK_HOMEBREW_CMD)
  }

  #installHomebrew (): void {
    this.execBash(BASH_INSTALL_HOMEBREW)
  }

  verifyInstall (): boolean {
    // Check if flow-cli is executable
    return false// this.execBash(CHECK_FLOW_CLI_CMD)
  }
}
