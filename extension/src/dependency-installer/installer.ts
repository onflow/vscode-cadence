/* Abstract Installer class */
import { window } from 'vscode'
import { envVars } from '../utils/shell/get-env-vars'

// InstallError is thrown if install fails
export class InstallError extends Error {}

export abstract class Installer {
  dependencies: Array<new () => Installer>
  #installerName: string

  constructor (name: string, dependencies: Array<new () => Installer>) {
    this.dependencies = dependencies
    this.#installerName = name
  }

  getName (): string {
    return this.#installerName
  }

  async runInstall (): Promise<void> {
    void window.showInformationMessage('Running ' + this.#installerName + ' installer, please wait...')
    await this.install()

    // Refresh env vars
    envVars.invalidate()

    // Check if install was successful
    if (!(await this.verifyInstall())) {
      throw new InstallError('Failed to install: ' + this.#installerName)
    }

    void window.showInformationMessage(this.#installerName + ' installed sucessfully. ' +
    'You may need to reload the extension.')
  }

  // Installation logic
  protected abstract install (): Promise<void> | void

  // Logic to check if dependency is installed
  abstract verifyInstall (): Promise<boolean>
}
