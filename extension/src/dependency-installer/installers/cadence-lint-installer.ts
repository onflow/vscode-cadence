import { Installer } from '../installer'
import * as pkg from '../../../../package.json'
import { execDefault } from '../../utils/utils'
import { checkHomebrew } from './homebrew-installer'
import { window } from 'vscode'
import { ext } from '../../main'

// Path to cadence-lint executable
export let CADENCE_LINT_PATH: string

// Install paths
const CADENCE_LINT_REPO = 'https://github.com/onflow/cadence-lint.git'
const MACOS_INSTALL_PATH = '~/.vscode/extensions/onflow.cadence-' + pkg.version + '/cadence-lint'
const EXECUTABLE_NAME = 'cadence-lint'

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
        CADENCE_LINT_PATH = ''
        // this.#install_windows()
        break
      default:
        CADENCE_LINT_PATH = ''
        // this.#install_bash_cmd()
        break
    }
  }

  protected install (): void {
    this.#installMethod()
  }

  #install_macos (): void {
    // Check if git is intalled
    if (!execDefault('git help')) {
      if (!checkHomebrew()) {
        window.showInformationMessage('Please install Homebrew to allow for the installation of Candence Lint')
        ext.checkDependencies()
        return
      }

      // Install git using Homebrew
      execDefault('brew install git')
      if (!execDefault('git help')) {
        console.log ('Could not install git')
        return
      }
    }

    // Clone cadence-lint repo
    // TODO: Check if it already exists
    if (!execDefault('git clone ' + CADENCE_LINT_REPO + ' ' + MACOS_INSTALL_PATH)) {
      console.log('Could not clone cadence-lint')
    }

    // Check if golang is installed
    if (!execDefault('go help')) {
      execDefault('brew install go')
      if (!execDefault('go help')) {
        console.log('Could not install golang')
        return
      }
    }

    // Build cadence-lint
    console.log('Building cadence-lint with golang')
    if (!execDefault('cd ' + MACOS_INSTALL_PATH + ' && go build -o .')) {
      console.log ('Failed to build cadence-lint with golang')
    }
  }

  protected verifyInstall (): boolean {
    return execDefault(CADENCE_LINT_PATH)
  }
}
