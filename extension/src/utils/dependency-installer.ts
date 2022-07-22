import { DEBUG_LOG } from "./debug"
import { InstallFlowCLI } from "./installers/install-flow-cli"


class DependencyInstaller {

  installers: (typeof Installer)[] = [
    InstallFlowCLI,
    InstallFlowCLI
  ]

  constructor() {
    // Add dependency installers
    this.installers = [
      new InstallFlowCLI()
    ]

  }

  checkDependencies(name: string) {
    // Check if dependencies are installed (put a checkmark and print it nice)
  }

  installDependencies(): void {
    this.installers.forEach( (installer: Installer) => {
      installer.install
    })


    try {
      installFlowCLI() 
    } catch (err) {
      DEBUG_LOG('Could not install flow-cli')
    }
  }


}



