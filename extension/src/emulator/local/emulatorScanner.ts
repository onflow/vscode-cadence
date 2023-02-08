import portScanner = require('portscanner-sync')
import awaitToJs = require('await-to-js')
import { window } from 'vscode'
import * as Config from './config'
import fetch from 'node-fetch'

const defaultHost = '127.0.0.1'
const gRPCPort = 3569
const adminPort = 8080

interface ConfigInfo {
  service_key: string
  startup_dir: string
}

let showLocationWarning = true

export async function emulatorExists (): Promise<boolean> {
  const [err, status] = await awaitToJs.to(portScanner.checkPortStatus(gRPCPort, defaultHost))
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
      void window.showWarningMessage(`Emulator detected running in a different directory than your flow.json 
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

  let emulatorDir: string | undefined
  try {
    const response = await fetch(`http://${defaultHost}:${adminPort}/config`)
    const configInfo: ConfigInfo = JSON.parse(await response.text())
    emulatorDir = configInfo.startup_dir
  } catch (err) { void err }

  return emulatorDir === flowJsonDir
}
