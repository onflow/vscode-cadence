/* Telemetry functions */
import * as sentry from './sentry-wrapper'
import * as mixpanel from './mixpanel-wrapper'
import { env, ExtensionContext } from 'vscode'
import * as pkg from '../../../package.json'
import * as uuid from 'uuid'
import { DEBUG_ACTIVE } from '../utils/debug'
import * as playground from './playground'

var extensionContext: ExtensionContext

export async function getUID (): Promise<string> {
  let uid: string | undefined = extensionContext.globalState.get<string>('uid')
  if (uid === undefined) {
    // Generate new uid and add it to global state
    uid = uuid.v4()
    await extensionContext.globalState.update('uid', uid)
  }
  return uid
}

// Called in main to setup telemetry
export async function initialize (ctx: ExtensionContext): Promise<void> {
  extensionContext = ctx

  // Check if user is allowing telemetry for vscode globally
  const activate: boolean = env.isTelemetryEnabled && !DEBUG_ACTIVE

  // Get unique UID
  const uid = await getUID()

  // Initialize Sentry
  await sentry.sentryInit(activate, uid, pkg.version)

  // Initialize Mixpanel
  await mixpanel.mixpanelInit(activate, uid, pkg.version)

  // Send initial statistics
  sendActivationStatistics()

  // Check if project was exported from Flow Playground
  var projectHash = await playground.getPlaygroundProjectHash()
  if (projectHash !== null) {
    sendPlaygroundProjectOpened(projectHash)
  }
}

// Called in main to deactivate telemetry
export async function deactivate (): Promise<void> {
  await sentry.sentryClose()
}

function sendActivationStatistics (): void {
  mixpanel.captureEvent(mixpanel.Events.ExtensionActivated)
}

// Wrap a function call with telemetry
export function withTelemetry (callback: (...args: any[]) => any): void {
  try {
    callback()
  } catch (err) {
    sentry.captureException(err)
    mixpanel.captureException(err)
    throw err
  }
}

async function emulatorConnected(): Promise<void> {
  
}

async function sendPlaygroundProjectOpened (projectHash: string): Promise<void> {
  let projectState: string | undefined = extensionContext.globalState.get<string>(projectHash)
  if (projectState !== undefined) {
    // Project was already reported
    return
  }
  await extensionContext.globalState.update(projectHash, playground.ProjectState.OPENED)
  mixpanel.captureEvent(mixpanel.Events.PlaygroundProjectOpened)
}

async function sendPlaygroundProjectDeployed (projectHash: string): Promise<void> {
  let projectState: string | undefined = extensionContext.globalState.get<string>(projectHash)
  if (projectState === playground.ProjectState.DEPLOYED) {
    // Project deployment was already reported
    return
  }
  await extensionContext.globalState.update(projectHash, playground.ProjectState.DEPLOYED)
  mixpanel.captureEvent(mixpanel.Events.PlaygroundProjectDeployed)
}
