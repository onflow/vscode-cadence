// import { exec } from 'child_process'
import { DEBUG_LOG } from '../debug'
import { Installer } from './installer'

const BASH_INSTALL_FLOW_CLI = 'sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"'

// Flow CLI with homebrew
const CHECK_HOMEBREW_CMD = 'brew help help' // Run this to check if brew is executable
const BASH_INSTALL_HOMEBREW = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
const BREW_INSTALL_FLOW_CLI = 'brew install flow-cli'

const CHECK_FLOW_CLI_CMD = 'flow'

export class InstallFlowCLI extends Installer {
  constructor () {
    super('Flow CLI')
  }

  install (): void {
    DEBUG_LOG('Running Flow CLI Installer...')
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
  }

  #install_x64 (): void {
    this.execBash(BASH_INSTALL_FLOW_CLI)
  }

  #install_arm (): void {
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

  #checkHomebrew (): boolean {
    return this.execBash(CHECK_HOMEBREW_CMD)
  }

  #installHomebrew (): void {
    this.execBash(BASH_INSTALL_HOMEBREW)
  }

  verifyInstall (): boolean {
    // Check if flow-cli is executable
    return this.execBash(CHECK_FLOW_CLI_CMD)
  }
}
