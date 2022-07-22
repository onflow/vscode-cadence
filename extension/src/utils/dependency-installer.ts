import { InstallFlowCLI } from './installers/flow-cli-installer'
import { Installer, InstallError } from './installers/installer'

// Installers for each dependency
const INSTALLERS = [
  InstallFlowCLI
]

export class DependencyInstaller {
  registeredInstallers: Installer[] = []

  constructor () {
    this.#registerInstallers()
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

  getMissingDependenciesList (): string[] {
    const missingDependencies: string[] = []
    this.registeredInstallers.forEach((installer) => {
      if (!installer.isInstalled()) {
        missingDependencies.push(installer.getName())
      }
    })
    return missingDependencies
  }

  allInstalled (): boolean {
    let installed: boolean = true
    this.registeredInstallers.forEach((installer) => {
      if (!installer.isInstalled()) {
        installed = false
      }
    })
    return installed
  }

  installMissingDependencies (): void {
    this.registeredInstallers.forEach((installer) => {
      try {
        installer.runInstall()
      } catch (err) {
        if (err instanceof InstallError) {
          // Ignore failed to install errors
        } else {
          throw err
        }
      }
    })
  }
}
