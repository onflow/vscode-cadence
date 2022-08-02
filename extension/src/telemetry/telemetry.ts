/* Telemetry functions */
import * as sentry from './sentry-wrapper'
import { env } from 'vscode'
import * as pkg from '../../../package.json'
import * as crypto from 'crypto'

// Generate unique userid from hashed serial number
var serialNumber = require('serial-number')
serialNumber.preferUUID = true

let hashID = ''

function updateID (hashID: string): void {
  console.log('UPDATED ID CALLED - id: ' + hashID)
  sentry.setUser(hashID)
}

function setUserID(): void {
  serialNumber(function (err: any, value: string) {
    hashID = crypto.createHash('sha256').update(value).digest('hex')
    updateID(hashID)
  })
}

// Called in main to setup telemetry
export async function initialize (): Promise<void> {
  // Check if user is allowing telemetry for vscode globally
  const activate: boolean = env.isTelemetryEnabled

  // Initialize Sentry
  await sentry.sentryInit(activate)

  // Set user id
  setUserID()

  // Send initial statistics
  sendVersionStatistics()
}

// Called in main to deactivate telemetry
export async function deactivate (): Promise<void> {
  await sentry.sentryClose()
}

function sendVersionStatistics (): void {
  sentry.captureStatistics('Activated Extension - version: ' + pkg.version)
}

// Wrap a function call with telemetry
export function withTelemetry (callback: (...args: any[]) => any): void {
  try {
    callback()
  } catch (err) {
    sentry.captureException(err)
    throw err
  }
}
