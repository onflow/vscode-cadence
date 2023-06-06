import { window } from 'vscode'
import { InstallFlowCLI } from './installers/flow-cli-installer'
import { Installer, InstallError } from './installer'
import { promptUserErrorMessage } from '../ui/prompts'
import { restartVscode } from '../utils/utils'
import { StateCache } from '../utils/state-cache'

const INSTALLERS: Array<new () => Installer> = [
  InstallFlowCLI
]

export class DependencyInstaller {
  registeredInstallers: Installer[] = []
  missingDependencies: StateCache<Installer[]>

  constructor () {
    this.#registerInstallers()

    this.missingDependencies = new StateCache(async () => {
      const missing: Installer[] = []
      for (const installer of this.registeredInstallers) {
        if (!(await installer.isInstalled())) {
          missing.push(installer)
        }
      }
      return missing
    })
    this.missingDependencies.subscribe((missing: Installer[]) => {
      if (missing.length === 0) {
        void window.showInformationMessage('All dependencies installed successfully.')
      } else {
        // Prompt user to install missing dependencies
        promptUserErrorMessage(
          'Not all dependencies are installed: ' + missing.map(x => x.getName()).join(', '),
          'Install Missing Dependencies',
          () => { void this.#installMissingDependencies() }
        )
      }
    })
  }

  async checkDependencies (): Promise<void> {
    this.missingDependencies.invalidate()
    await this.missingDependencies.getValue()
  }

  async installMissing (): Promise<void> {
    await this.#installMissingDependencies()
  }

  #registerInstallers (): void {
    // Recursively register installers and their dependencies in the correct order
    (function registerInstallers (this: DependencyInstaller, installers: Array<new () => Installer>) {
      installers.forEach((_installer) => {
        const installer = new _installer()
        registerInstallers.bind(this)(installer.dependencies)
        if (this.registeredInstallers.find(x => x instanceof _installer) == null) { this.registeredInstallers.push(installer) }
      })
    }).bind(this)(INSTALLERS)
  }

  async #installMissingDependencies (): Promise<void> {
    await Promise.all((await this.missingDependencies.getValue()).map(async (installer) => {
      try {
        await installer.runInstall()
      } catch (err) {
        if (err instanceof InstallError) {
          void window.showErrorMessage(err.message)
        } else {
          throw err
        }
      }
    }))

    const OS_TYPE = process.platform
    if (OS_TYPE === 'win32') {
      promptUserErrorMessage(
        'All dependencies installed successfully.  You may need to restart VSCode.',
        'Restart VSCode Now',
        restartVscode
      )
    } else {
      void window.showInformationMessage('All dependencies installed successfully.  You may need to restart active terminals.')
    }
  }
}
