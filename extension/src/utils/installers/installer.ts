/* Installer class */
import { execSync } from 'child_process'

export class InstallError extends Error {}

export abstract class Installer {
  #installerName: string
  #installed: boolean

  constructor (name: string) {
    this.#installerName = name
    this.#installed = false //this.verifyInstall()
  }

  getName (): string {
    return this.#installerName
  }

  runInstall (): void {
    if (this.#installed) {
      return
    }

    this.install()

    if (!this.verifyInstall()) {
      throw new InstallError('Failed to install: ' + this.#installerName)
    }
    this.#installed = true
  }

  execPowerShell (cmd: string): boolean {
    try {
      execSync(cmd, { shell: 'powershell.exe' })
    } catch (err) {
      return false
    }
    return true
  }

  execBash (cmd: string): boolean {
    try {
      execSync(cmd)
    } catch (err) {
      return false
    }
    return true
  }

  // Installation logic
  abstract install (): void

  // Returns true if the dependency is installed
  abstract verifyInstall (): boolean
}
