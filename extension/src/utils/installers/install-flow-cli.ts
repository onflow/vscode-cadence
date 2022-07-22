import { exec } from "child_process";
import { Installer } from '../dependency-installer'

const BASH_INSTALL_FLOW_CLI = 'sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"'
const BASH_INSTALL_HOMEBREW = ''
const BREW_INSTALL_FLOW_CLI = 'brew install flow-cli'



export class InstallFlowCLI extends Installer {

  constructor() {
    super()
  }

  #install(): void {
    // Install code
  }
}

/*
export function installFlowCLI(): void {
  // TODO: Should we implement this script custom for extension, or just try to run it if on a supported processor?
  //exec(BASH_INSTALL_FLOW_CLI)
  // TODO: Can we do anything if you're on mac? Need to install brew lol.
  installFlowCLI()


  if (!checkHomebrew()) {
    exec(BASH_INSTALL_HOMEBREW)
    if (!checkHomebrew) {
      throw new Error ()
    }
  }
  exec(BREW_INSTALL_FLOW_CLI)
}

function checkHomebrew(): boolean {
  const CHECK_HOMEBREW_CMD = 'which -s brew'
  let installed: boolean = true
  exec(CHECK_HOMEBREW_CMD, (error, stdout, stderr) => {
    if (error) {
      installed = false
    }
    if (stderr) {
      installed = false
    }
    installed = true
  })
  return installed
}
*/
