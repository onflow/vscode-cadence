import { window } from 'vscode'
import { execDefault, execPowerShell } from '../../utils/utils'
import { promptUserInfoMessage } from '../../ui/prompts'
import { Installer } from '../installer'
import { exec, execSync } from 'child_process'

const CADENCE_LINT_REPO = 'https://github.com/onflow/cadence-lint.git'
const MACOS_INSTALL_PATH = '~/.vscode/extensions/onflow.cadence*/'

export class InstallCadenceLint extends Installer {
  constructor () {
    super('Cadence Lint')
  }

  protected install(): void {
    const OS_TYPE = process.platform
    switch (OS_TYPE) {
      case 'darwin':
      case 'linux':
        this.#install_macos()
        break
      case 'win32':
        //this.#install_windows()
        break
      default:
        //this.#install_bash_cmd()
        break
    }
  }

  #install_macos (): void {
    this.#checkoutCadenceLint()

  }

  #checkoutCadenceLint (): void {
    exec('git clone ' + CADENCE_LINT_REPO + ' ' + MACOS_INSTALL_PATH, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    })

    /*
    try {
      execDefault('git checkout ' + CADENCE_LINT_REPO)
    } catch (err) {
      // Make sure git is installed?
    }
    */
    
  }

  protected verifyInstall(): boolean {
    return false
  }
}