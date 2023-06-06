/* Abstract Installer class */
import { window } from 'vscode'
import * as os from 'os'

// InstallError is thrown if install fails
export class InstallError extends Error {}

export abstract class Installer {
  dependencies: Array<new () => Installer>
  #installerName: string
  #installed: Promise<boolean> | boolean

  constructor (name: string, dependencies: Array<new () => Installer>) {
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

  async runInstall (): Promise<void> {
    if (await this.isInstalled()) {
      return
    }

    void window.showInformationMessage('Running ' + this.#installerName + ' installer, please wait...')
    await this.install()

    if (os.platform() !== 'win32' && !await this.verifyInstall()) {
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
