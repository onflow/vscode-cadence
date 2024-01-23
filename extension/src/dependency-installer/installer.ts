/* Abstract Installer class */
import { window } from 'vscode'
import { envVars } from '../utils/shell/env-vars'
import { LanguageServerAPI } from '../server/language-server'
import { FlowVersionProvider } from '../flow-cli/flow-version-provider'

// InstallError is thrown if install fails
export class InstallError extends Error {}

export interface InstallerContext {
  refreshDependencies: () => Promise<void>
  languageServerApi: LanguageServerAPI
  flowVersionProvider: FlowVersionProvider
}

export type InstallerConstructor = new (context: InstallerContext) => Installer

export abstract class Installer {
  dependencies: InstallerConstructor[]
  #installerName: string

  constructor (name: string, dependencies: InstallerConstructor[]) {
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
