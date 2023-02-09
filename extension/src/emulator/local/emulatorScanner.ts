import portScanner = require('portscanner-sync')
import awaitToJs = require('await-to-js')
import { window } from 'vscode'
import * as Config from './config'
import fetch from 'node-fetch'
import * as fs from 'fs'
import EC = require('elliptic')

const defaultHost = '127.0.0.1'
const gRPCPort = 3569
const adminPort = 8080
const emulatorConfigURL = `http://${defaultHost}:${adminPort}/emulator/config`

const ECDSA_P256 = new EC('p256')

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
  if (!await verifyEmulator()) {
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

export async function verifyEmulator (): Promise<boolean> {
  const flowJsonPath = await Config.getConfigPath()
  const flowJsonData = JSON.parse(fs.readFileSync(flowJsonPath, 'utf-8'))

  let flowJsonPrivKey: string
  try {
    flowJsonPrivKey = flowJsonData.accounts['emulator-account'].key
  } catch (err) {
    console.log(`Could not read emulator-account key from ${flowJsonPath}`)
    return false
  }

  let emulatorPublicKey: string
  try {
    const response = await fetch(emulatorConfigURL)
    const config: EmulatorConfig = JSON.parse(await response.text())
    emulatorPublicKey = config.service_key.substring(2)
  } catch (err) {
    console.log(`Could not obtain emulator public key from ${emulatorConfigURL}`)
    return false
  }

  // Verify flow.json public key matches emulator public key
  const key = ECDSA_P256.keyFromPrivate(flowJsonPrivKey)
  const flowJsonPublicKey = key.getPublic('hex').toString().substring(2)
  return emulatorPublicKey === flowJsonPublicKey
}
