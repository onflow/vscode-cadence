/* Telemetry functions */
import * as sentry from './sentry-wrapper'
import * as mixpanel from './mixpanel-wrapper'
import { env, ExtensionContext } from 'vscode'
import * as pkg from '../../../package.json'
import * as uuid from 'uuid'
import { DEBUG_ACTIVE } from '../utils/debug'

export async function getUID (ctx: ExtensionContext): Promise<string> {
  let uid: string | undefined = ctx.globalState.get<string>('uid')
  if (uid === undefined) {
    // Generate new uid and add it to global state
    uid = uuid.v4()
    await ctx.globalState.update('uid', uid)
  }
  return uid
}

// Called in main to setup telemetry
export async function initialize (ctx: ExtensionContext): Promise<void> {
  // Check if user is allowing telemetry for vscode globally
  const activate: boolean = env.isTelemetryEnabled && !DEBUG_ACTIVE

  // Get unique UID
  const uid = await getUID(ctx)

  // Initialize Sentry
  await sentry.sentryInit(activate, uid, pkg.version)

  // Initialize Mixpanel
  await mixpanel.mixpanelInit(activate, uid, pkg.version)

  // Send initial statistics
  sendActivationStatistics()
}

// Called in main to deactivate telemetry
export async function deactivate (): Promise<void> {
  await sentry.sentryClose()
}

function sendActivationStatistics (): void {
  mixpanel.captureStatistics(mixpanel.Events.Activation)
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

export function trackEvent (eventName: string, properties: {}): void {
  mixpanel.captureStatistics(eventName, properties)
}
