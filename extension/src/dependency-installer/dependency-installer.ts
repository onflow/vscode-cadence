import { window } from 'vscode'
import { InstallFlowCLI } from './installers/flow-cli-installer'
import { Installer, InstallerConstructor, InstallerContext, InstallError } from './installer'
import { promptUserErrorMessage } from '../ui/prompts'
import { StateCache } from '../utils/state-cache'
import { LanguageServerAPI } from '../server/language-server'
import { FlowVersionProvider } from '../flow-cli/flow-version-provider'

const INSTALLERS: InstallerConstructor[] = [
  InstallFlowCLI
]

export class DependencyInstaller {
  registeredInstallers: Installer[] = []
  missingDependencies: StateCache<Installer[]>
  #installerContext: InstallerContext

  constructor (languageServerApi: LanguageServerAPI, flowVersionProvider: FlowVersionProvider) {
    this.#installerContext = {
      refreshDependencies: this.checkDependencies.bind(this),
      languageServerApi,
      flowVersionProvider
    }
    this.#registerInstallers()

    // Create state cache for missing dependencies
    this.missingDependencies = new StateCache(async () => {
      const missing: Installer[] = []
      for (const installer of this.registeredInstallers) {
        if (!(await installer.verifyInstall())) {
          missing.push(installer)
        }
      }
      return missing
    })

    // Display error message if dependencies are missing
    this.missingDependencies.subscribe((missing: Installer[]) => {
      if (missing.length !== 0) {
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
    // Invalidate and wait for state to update
    // This will trigger the missingDependencies subscriptions
    await this.missingDependencies.getValue(true)
  }

  async installMissing (): Promise<void> {
    await this.#installMissingDependencies()
  }

  #registerInstallers (): void {
    // Recursively register installers and their dependencies in the correct order
    (function registerInstallers (this: DependencyInstaller, installers: InstallerConstructor[]) {
      installers.forEach((_installer) => {
        // Check if installer is already registered
        if (this.registeredInstallers.find(x => x instanceof _installer) != null) { return }

        // Register installer and dependencies
        const installer = new _installer(this.#installerContext)
        registerInstallers.bind(this)(installer.dependencies)
        this.registeredInstallers.push(installer)
      })
    }).bind(this)(INSTALLERS)
  }

  async #installMissingDependencies (): Promise<void> {
    const missing = await this.missingDependencies.getValue()
    const installed: Installer[] = this.registeredInstallers.filter(x => !missing.includes(x))

    await new Promise<void>((resolve, reject) => {
      setTimeout(() => { resolve() }, 2000)
    })

    for (const installer of missing) {
      try {
        // Check if dependencies are installed
        const missingDeps = installer.dependencies
          .filter(x => installed.find(y => y instanceof x) == null)
          .map(x => this.registeredInstallers.find(y => y instanceof x))

        // Show error if dependencies are missing
        if (missingDeps.length !== 0) {
          throw new InstallError('Cannot install ' + installer.getName() + '. Missing depdenencies: ' + missingDeps.map(x => x?.getName()).join(', '))
        }

        await installer.runInstall()
        installed.push(installer)
      } catch (err) {
        if (err instanceof InstallError) {
          void window.showErrorMessage(err.message)
        }
      }
    }

    // Refresh missing dependencies
    this.missingDependencies.invalidate()
    const failed = await this.missingDependencies.getValue()

    if (failed.length !== 0) {
      // Find all failed installations
      void window.showErrorMessage('Failed to install all dependencies.  The following may need to be installed manually: ' + failed.map(x => x.getName()).join(', '))
    } else {
      if (process.platform === 'win32') {
        // Windows requires a restart of VSCode to refresh environment variables
        void window.showInformationMessage('All dependencies installed successfully.  Newly installed dependencies will not be available in terminals until VSCode is restarted.')
      } else if (process.platform !== 'darwin') {
        // Linux requires a fresh login to refresh environment variables for new terminals
        void window.showInformationMessage('All dependencies installed successfully.  Newly installed dependencies will not be available in terminals until you log out and back in.')
      } else {
        // MacOS requires a restart of active terminals to refresh environment variables
        void window.showInformationMessage('All dependencies installed successfully.  You may need to restart active terminals.')
      }
    }
  }
}
