/* Installer for homebrew (macos/ linux) */
import { window } from "vscode"
import { promptUserInfoMessage } from "../../ui/prompts"
import { execDefault } from "../../utils/utils"
import { Installer } from "../installer"

// Homebrew
const CHECK_HOMEBREW_CMD = 'brew help help' // Run this to check if brew is executable
const BASH_INSTALL_HOMEBREW = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'

export function checkHomebrew(): boolean {
  return execDefault(CHECK_HOMEBREW_CMD)
}

export class InstallHomebrew extends Installer {
  #installMethod!: Function

  OS_TYPE: string = process.platform

  constructor () {
    super('Homebrew')
  }

  protected install(): void {
    promptUserInfoMessage(
      'Please install Homebrew to allow for the installation of other dependencies',
      'Install Hombrew in terminal',
      () => { this.#installHomebrew() }
    )
  }

  #installHomebrew (): void {
    // Help user install homebrew in a terminal
    const term = window.createTerminal({
      name: 'Install Homebrew',
      hideFromUser: true
    })
    term.sendText(BASH_INSTALL_HOMEBREW)
    term.show()
  }

  protected verifyInstall(): boolean {
    switch (this.OS_TYPE) {
      case 'darwin':
      case 'linux':
        // Verify for macos / linux only
        return execDefault(CHECK_HOMEBREW_CMD)
      default:
        return true
    }
  }
}
