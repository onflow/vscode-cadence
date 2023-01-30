import portScanner = require('portscanner-sync')
import awaitToJs = require('await-to-js')
import find = require('find-process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)
import { window } from 'vscode'

export async function emulatorExists (): Promise<boolean> {
  const defaultHost = '127.0.0.1'
  const defaultPort = 3569
  const [err, status] = await awaitToJs.to(portScanner.checkPortStatus(defaultPort, defaultHost))
  if (err != null) {
    console.error(err)
    return false
  }

  if (status !== 'open') {
    return false
  }

  // TODO: Only consider an emulator as valid if it's in the same dir as flow.json
  // TODO: Otherwise the LS will crash anyways, so we shouldn't connect to it and 
  // TODO: give a warning instead
  if (!await validEmulatorLocation()) {
    window.showWarningMessage(`Emulator detected running in a different directory than your flow.json 
    config. To connect an emulator, please run 'flow emulator' in the same directory as your flow.json`)
  }



  return status === 'open'
}

// Warn user if running emulator in different directory from flow.json
async function validEmulatorLocation (configPath: string): Promise<boolean> {
  let flowJsonDir = configPath.substring(0, configPath.lastIndexOf('/'))
  let emulatorDir = await emulatorRunPath()
  return emulatorDir === flowJsonDir
}


// Tries to return the path where flow emulator was run from
export async function emulatorRunPath (): Promise<string | undefined> {
  // TODO: Find path on Windows as well!!


  try {
    let emuProccessInfo = (await find('name', 'flow emulator'))

    // TODO: Check if empty
    if (!emuProccessInfo) {
      return undefined
    }

    const pid = emuProccessInfo[0].pid
    const cwdIndex = 8 // Dir index in lsof command
    let output = await exec(`lsof -p ${pid} | grep cwd`)
    let emulatorPath: string = output.stdout.trim().split(/\s+/)[cwdIndex]

    return emulatorPath
  } catch (err) {
    return undefined
  }
}
