/* Abstract Installer class */
import { window } from 'vscode'

// InstallError is thrown if install fails
export class InstallError extends Error {}

export abstract class Installer {
  #installerName: string
  #installed: boolean

  constructor (name: string) {
    this.#installerName = name
    this.#installed = this.verifyInstall()
  }

  getName (): string {
    return this.#installerName
  }

  isInstalled (): boolean {
    return this.#installed
  }

  runInstall (): void {
    if (this.#installed) {
      return
    }

    void window.showInformationMessage('Running ' + this.#installerName + ' installer...')
    this.install()

    if (!this.verifyInstall()) {
      throw new InstallError('Failed to install: ' + this.#installerName)
    }

    this.#installed = true
    void window.showInformationMessage(this.#installerName + ' installed sucessfully. ' +
    'You may need to reload the extension.')
  }

  // Installation logic
  protected abstract install (): void

  // Logic to check if dependency is installed
  protected abstract verifyInstall (): boolean
}
