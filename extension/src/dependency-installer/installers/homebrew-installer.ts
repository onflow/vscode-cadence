/* Installer for Flow CLI */
import { execVscodeTerminal, tryExecDefault } from '../../utils/shell/exec'
import { Installer, InstallerConstructor } from '../installer'

// Flow CLI with homebrew
const CHECK_HOMEBREW_CMD = 'brew help help' // Run this to check if brew is executable
const BASH_INSTALL_HOMEBREW = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'

export class HomebrewInstaller extends Installer {
  constructor () {
    super('Homebrew', [])
  }

  async install (): Promise<void> {
    await execVscodeTerminal('Install Homebrew', BASH_INSTALL_HOMEBREW)
  }

  async verifyInstall (): Promise<boolean> {
    return await tryExecDefault(CHECK_HOMEBREW_CMD)
  }
}
