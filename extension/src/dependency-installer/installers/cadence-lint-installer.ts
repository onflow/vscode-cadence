// import { window } from 'vscode'
// import { execDefault, execPowerShell } from '../../utils/utils'
// import { promptUserInfoMessage } from '../../ui/prompts'
import { Installer } from '../installer'
import { exec } from 'child_process'
import * as pkg from '../../../../package.json'
import { execDefault } from '../../utils/utils'

const CADENCE_LINT_REPO = 'https://github.com/onflow/cadence-lint.git'
const MACOS_INSTALL_PATH = '~/.vscode/extensions/onflow.cadence-' + pkg.version + '/cadence-lint'
const EXECUTABLE_NAME = 'cadence-lint'

// Path to cadence-lint executable
export let CADENCE_LINT_PATH = ''

export class InstallCadenceLint extends Installer {
  #installMethod!: Function

  constructor () {
    super('Cadence Lint')

    const OS_TYPE = process.platform
    switch (OS_TYPE) {
      case 'darwin':
      case 'linux':
        CADENCE_LINT_PATH = MACOS_INSTALL_PATH + '/' + EXECUTABLE_NAME
        this.#installMethod = this.#install_macos
        break
      case 'win32':
        // this.#install_windows()
        break
      default:
        // this.#install_bash_cmd()
        break
    }
  }

  protected install (): void {
    this.#installMethod()
  }

  #install_macos (): void {
    CADENCE_LINT_PATH = MACOS_INSTALL_PATH
    // Clone cadence-lint repo
    console.log('clonning repo')
    if (!execDefault('git clone ' + CADENCE_LINT_REPO + ' ' + MACOS_INSTALL_PATH)) {
      console.log('could not clone cadence-lint')
    }

    console.log('building cadence-lint with golang')
    if (!execDefault('cd ' + MACOS_INSTALL_PATH + ' && go build -o .')) {
      console.log ('Failed to build cadence-lint with golang')
    }

    if (!execDefault(CADENCE_LINT_PATH)) {
      console.log('Cannot run cadence-lint')
    } else {
      console.log('ran cadence-lint!!')
    }

  }

  protected verifyInstall (): boolean {
      return execDefault(CADENCE_LINT_PATH)
  }
}
