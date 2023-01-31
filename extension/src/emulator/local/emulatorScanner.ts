import portScanner = require('portscanner-sync')
import awaitToJs = require('await-to-js')
import find = require('find-process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)
import { window } from 'vscode'
import * as Config from './config'
import os = require("os")

let showLocationWarning = true

export async function emulatorExists (): Promise<boolean> {
  const defaultHost = '127.0.0.1'
  const defaultPort = 3569
  const [err, status] = await awaitToJs.to(portScanner.checkPortStatus(defaultPort, defaultHost))
  if (err != null) {
    console.error(err)
    return false
  }

  if (status !== 'open') {
    showLocationWarning = true
    return false
  }

  // Only connect to emulator if running in same dir as flow.json or else LS will crash
  if (!await validEmulatorLocation()) {
    if (showLocationWarning) {
      window.showWarningMessage(`Emulator detected running in a different directory than your flow.json 
      config. To connect an emulator, please run 'flow emulator' in the same directory as your flow.json`)
      showLocationWarning = false // Avoid spamming the location warning
    }
    return false
  }

  showLocationWarning = true

  return true
}

export async function validEmulatorLocation (): Promise<boolean> {
  const configPath = await Config.getConfigPath()
  const flowJsonDir = configPath.substring(0, configPath.lastIndexOf('/'))
  let emulatorDir: string | undefined = undefined

  switch (os.platform()) {
    case 'darwin':
    case 'linux':
      emulatorDir = await emulatorRunPath()
      break
    case 'win32':
      // No nice way to find location on Windows
    default:
      console.log('Cannot verify emulator location on', os.platform())
      return true // Allow connections to any emulator
  }

  return emulatorDir === flowJsonDir
}

export async function emulatorRunPath (): Promise<string | undefined> {
  try {
    let emuProccessInfo = (await find('name', 'flow emulator'))
    if (!emuProccessInfo) {
      console.log('No running flow emulator process')
      return undefined
    }

    const pid = emuProccessInfo[0].pid
    const cwdIndex = 8 // Runpath dir index in lsof command
    let output = await exec(`lsof -p ${pid} | grep cwd`)
    let emulatorPath: string = output.stdout.trim().split(/\s+/)[cwdIndex]

    return emulatorPath
  } catch (err) {
    return undefined
  }
}
