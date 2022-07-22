
export class Installer {
  #name: string = ''

  #installed: boolean = false
  isInstalled(): boolean { return this.#installed }

  installDependency(): boolean {
    this.#install()
    if (! this.isInstalled()) {
      throw new InstallError('Failed to install ' + )
    }

    return this.isInstalled() ? true : this.#install()
  }

  #install(): boolean { return true }
}

export class InstallError extends Error {}