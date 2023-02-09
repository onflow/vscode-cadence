import portScanner = require('portscanner-sync')
import awaitToJs = require('await-to-js')
import { window } from 'vscode'
import * as Config from './config'
import fetch from 'node-fetch'
import * as fs from 'fs'

const defaultHost = '127.0.0.1'
const gRPCPort = 3569
const adminPort = 8080
const emulatorConfigURL = `http://${defaultHost}:${adminPort}/emulator/config`

interface EmulatorConfig {
  service_key: string
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
  const flowJsonPath = await Config.getConfigPath()
  const flowJsonData = JSON.parse(fs.readFileSync(flowJsonPath, 'utf-8'))

  let flowJsonKey: string
  try {
    flowJsonKey = `0x${flowJsonData.accounts['emulator-account'].key as string}`
  } catch (err) {
    console.log(`Could not read emulator-account key from ${flowJsonPath}`)
    return false
  }

  let emulatorKey: string
  try {
    const response = await fetch(emulatorConfigURL)
    const config: EmulatorConfig = JSON.parse(await response.text())
    emulatorKey = config.service_key
  } catch (err) {
    console.log(`Could not obtain emulator key from ${emulatorConfigURL}`)
    return false
  }

  return emulatorKey === flowJsonKey
}
