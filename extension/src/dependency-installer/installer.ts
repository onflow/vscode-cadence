/* Abstract Installer class */
import { window } from 'vscode'
import { envVars } from '../utils/shell/env-vars'
import { LanguageServerAPI } from '../server/language-server'

// InstallError is thrown if install fails
export class InstallError extends Error {}

export interface InstallerContext {
  refreshDependencies: () => Promise<void>
  langaugeServerApi: LanguageServerAPI
}

export type InstallerConstructor = new (context: InstallerContext) => Installer

export abstract class Installer {
  dependencies: Array<InstallerConstructor>
  #installerName: string

  constructor (name: string, dependencies: Array<InstallerConstructor>) {
    this.dependencies = dependencies
    this.#installerName = name
  }

  getName (): string {
    return this.#installerName
  }

  async runInstall (): Promise<void> {
    void window.showInformationMessage('Running ' + this.#installerName + ' installer, please wait...')

    try {
      await this.install()
    } catch {
      throw new InstallError('Failed to install: ' + this.#installerName)
    }

    // Refresh env vars
    envVars.invalidate()

    // Check if install was successful
    if (!(await this.verifyInstall())) {
      throw new InstallError('Failed to install: ' + this.#installerName)
    }

    void window.showInformationMessage(this.#installerName + ' installed sucessfully.')
  }

  // Installation logic
  protected abstract install (): Promise<void> | void

  // Logic to check if dependency is installed
  abstract verifyInstall (): Promise<boolean>
}
