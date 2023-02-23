import { window } from 'vscode'
import * as Config from './flowConfig'
import { ec } from 'elliptic'
import fetch from 'node-fetch'

const defaultHost = '127.0.0.1'
const adminPort = 8080
const emulatorConfigURL = `http://${defaultHost}:${adminPort}/emulator/config`

const ECDSA_P256 = ec('p256')

interface EmulatorConfig {
  service_key: string
}

let showLocationWarning = true

export async function verifyEmulator (): Promise<boolean> {
  const flowJsonPrivKey = await Config.getAccountKey(Config.EMULATOR_ACCOUNT)
  if (flowJsonPrivKey === undefined) {
    return false
  }

  console.log('GETTING EMULATOR PUBLIC KEY')
  const emulatorPublicKey = await getEmulatorKey()
  if (emulatorPublicKey === undefined) {
    showLocationWarning = true // No emulator running, warn if detected in wrong location
    return false
  }

  if (!verifyKeys(flowJsonPrivKey, emulatorPublicKey)) {
    if (showLocationWarning) {
      void window.showWarningMessage(`Emulator detected running with different keys than your flow.json 
      config. To connect an emulator, please run 'flow emulator' in the same directory as your flow.json`)
      showLocationWarning = false // Avoid spamming the location warning
    }
    return false
  }

  return true
}

export function verifyKeys (privateKey: string, publicKey: string): boolean {
  const keyPair = ECDSA_P256.keyFromPrivate(privateKey)
  const testKey = keyPair.getPublic('hex').toString().substring(2)
  return testKey === publicKey
}

async function getEmulatorKey (): Promise<string | undefined> {  
  let emulatorPublicKey: string | undefined
  try {
    console.log('fetching emulator public key...')
    const response = await fetch(emulatorConfigURL)
    const config: EmulatorConfig = JSON.parse(await response.text())
    emulatorPublicKey = config.service_key.replace('0x', '')
  } catch (err) {
    console.log(`Could not obtain public key from ${emulatorConfigURL}`)
  }
  return emulatorPublicKey
}
