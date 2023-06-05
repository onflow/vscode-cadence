/* Abstract Installer class */
import { window } from 'vscode'

// InstallError is thrown if install fails
export class InstallError extends Error {}

export abstract class Installer {
  dependencies: (new () => Installer)[]
  #installerName: string
  #installed: Promise<boolean> | boolean

  constructor (name: string, dependencies: (new () => Installer)[]) {
    this.dependencies = dependencies
    this.#installerName = name
    this.#installed = this.verifyInstall()
  }

  getName (): string {
    return this.#installerName
  }

  async isInstalled (): Promise<boolean> {
    return await this.#installed
  }

  // Run installer for this dependency and return true if needs a restart to take effect
  async runInstall (): Promise<void> {
    if (await this.isInstalled()) {
      return
    }

    void window.showInformationMessage('Running ' + this.#installerName + ' installer, please wait...')
    await this.install()

    if (!this.verifyInstall()) {
      throw new InstallError('Failed to install: ' + this.#installerName)
    }

    this.#installed = true

    void window.showInformationMessage(this.#installerName + ' installed sucessfully. ' +
    'You may need to reload the extension.')
  }

  // Installation logic
  protected abstract install (): Promise<void> | void

  // Logic to check if dependency is installed
  protected abstract verifyInstall (): Promise<boolean>
}
