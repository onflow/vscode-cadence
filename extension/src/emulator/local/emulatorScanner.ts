import portScanner = require('portscanner-sync')
import awaitToJs = require('await-to-js')
import find = require('find-process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)

export async function emulatorExists (): Promise<boolean> {
  const defaultHost = '127.0.0.1'
  const defaultPort = 3569
  const [err, status] = await awaitToJs.to(portScanner.checkPortStatus(defaultPort, defaultHost))
  if (err != null) {
    console.error(err)
    return false
  }

  return status === 'open'
}

// Warn user if running emulator in different directory from flow.json
export async function checkEmulatorLocation (flowJsonDir: string): Promise<void> {
  let emulatorDir = await emulatorRunPath()

  console.log("flow.json dir: ", flowJsonDir)
  console.log("flow emulator dir: ", emulatorDir)

  //TODO: Make sure flowJsonDir doesn't have /flow.json at the end of it
  if (emulatorDir !== flowJsonDir) {
    // TODO: Warn user that the emulator they're running is not running from the
    // TODO: same directory as their flow.json
    //window.showWarningMessage(`Emulator is running from: ${emulatorPath}`)
  }
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
