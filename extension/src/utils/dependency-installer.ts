import { InstallFlowCLI } from './installers/flow-cli-installer'
import { Installer } from './installers/installer'

// Installers for each dependency
const installers = [
  InstallFlowCLI
]

export class DependencyInstaller {
  registeredInstallers: Installer[] = []
  // Map dependency name to corresponding installed state
  dependencies: { [name: string]: boolean } = {}

  constructor () {
    this.#registerInstallers()
    this.#checkDependencies()
  }

  prettyPrintDepencencies (): void {
    console.log('Dependencies:')
    for (const key in this.dependencies) {
      const value = this.dependencies[key]
      if (value) {
        console.log('  ' + key + ' ✓')
      } else {
        console.log('  ' + key + ' x')
      }
    }
  }

  #registerInstallers (): void {
    installers.forEach((_installer) => {
      const installer = new _installer()
      this.registeredInstallers.push(installer)
    })
  }

  #checkDependencies (): void {
    this.registeredInstallers.forEach((installer) => {
      this.dependencies[installer.getName()] = installer.verifyInstall()
    })
  }

  installMissingDependencies (): void {
    this.registeredInstallers.forEach((installer) => {
      try {
        installer.runInstall()
      } catch (err) {
        // Handle failed to install errors
      }
    })
    this.#checkDependencies()
  }
}
