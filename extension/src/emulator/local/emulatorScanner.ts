import { window } from 'vscode'
import * as Config from './config'
import fetch from 'node-fetch'
import * as fs from 'fs'
import { ec } from 'elliptic'

const defaultHost = '127.0.0.1'
const adminPort = 8080
const emulatorConfigURL = `http://${defaultHost}:${adminPort}/emulator/config`

const ECDSA_P256 = ec('p256')

interface EmulatorConfig {
  service_key: string
}

let showLocationWarning = true

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
    console.log(`No emulator running. Could not obtain public key from ${emulatorConfigURL}`)
    showLocationWarning = true
    return false
  }

  // Verify flow.json public key matches emulator public key
  const key = ECDSA_P256.keyFromPrivate(flowJsonPrivKey)
  const flowJsonPublicKey = key.getPublic('hex').toString().substring(2)

  if (emulatorPublicKey !== flowJsonPublicKey) {
    if (showLocationWarning) {
      void window.showWarningMessage(`Emulator detected running with different keys than your flow.json 
      config. To connect an emulator, please run 'flow emulator' in the same directory as your flow.json`)
      showLocationWarning = false // Avoid spamming the location warning
    }
    return false
  }

  return true
}
