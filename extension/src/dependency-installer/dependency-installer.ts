import { window } from 'vscode'
import { InstallFlowCLI } from './installers/flow-cli-installer'
import { Installer, InstallError } from './installer'
import { promptUserErrorMessage } from '../ui/prompts'
import { InstallCadenceLint } from './installers/cadence-lint-installer'
import { InstallHomebrew } from './installers/homebrew-installer'

const INSTALLERS = [
  InstallHomebrew,
  InstallFlowCLI,
  InstallCadenceLint
  // Add other dependency installers here
]

export class DependencyInstaller {
  registeredInstallers: Installer[] = []

  constructor () {
    this.#registerInstallers()
    this.checkDependencies()
  }

  checkDependencies (): void {
    if (!this.#allInstalled()) {
      const missing: string[] = this.#getMissingDependenciesList()

      // Prompt user to install missing dependencies
      promptUserErrorMessage(
        'Not all dependencies are installed: ' + missing.join(', '),
        'Install Missing Dependencies',
        () => { this.#installMissingDependencies() }
      )
    } else {
      void window.showInformationMessage('All dependencies are installed')
    }
  }

  prettyPrintDepencencies (): void {
    console.log('Dependencies:')
    this.registeredInstallers.forEach((installer) => {
      const installerName = installer.getName()
      if (installer.isInstalled()) {
        console.log('  ' + installerName + ' ✓')
      } else {
        console.log('  ' + installerName + ' x')
      }
    })
  }

  #registerInstallers (): void {
    INSTALLERS.forEach((_installer) => {
      const installer = new _installer()
      this.registeredInstallers.push(installer)
    })
  }

  #getMissingDependenciesList (): string[] {
    const missingDependencies: string[] = []
    this.registeredInstallers.forEach((installer) => {
      if (!installer.isInstalled()) {
        missingDependencies.push(installer.getName())
      }
    })
    return missingDependencies
  }

  #allInstalled (): boolean {
    return this.registeredInstallers.find(installer => !installer.isInstalled()) == null
  }

  #installMissingDependencies (): void {
    this.registeredInstallers.forEach((installer) => {
      try {
        installer.runInstall()
        window.showInformationMessage(installer.getName() + ' installed')
      } catch (err) {
        if (err instanceof InstallError) {
          void window.showErrorMessage(err.message)
        } else {
          throw err
        }
      }
    })
  }
}
