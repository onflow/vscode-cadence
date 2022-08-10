/* Telemetry functions */
import * as sentry from './sentry-wrapper'
import { env, ExtensionContext } from 'vscode'
import { DEBUG_ACTIVE } from '../utils/debug'
import * as uuid from 'uuid'
import * as pkg from '../../../package.json'

async function getUID (ctx: ExtensionContext): Promise<string> {
  const uid: string | undefined = ctx.globalState.get<string>('uid')
  if (uid === undefined) {
    // Generate new uid and add it to global state
    const uidGen: string = uuid.v4()
    await ctx.globalState.update('uid', uidGen)
    return uidGen
  }
  return uid
}

// Called in main to setup telemetry
export async function initialize (ctx: ExtensionContext): Promise<void> {
  // Check if user is allowing telemetry for vscode globally
  const activate: boolean = env.isTelemetryEnabled && !DEBUG_ACTIVE

  // Initialize Sentry
  await sentry.sentryInit(activate)

  // Get unique UID
  const uid = await getUID(ctx)

  // Set uid for Sentry
  sentry.setUser(uid)

  // Send initial statistics
  sendVersionStatistics()
}

function sendVersionStatistics (): void {
  sentry.captureStatistics('Activated Extension - version: ' + pkg.version)
}

// Called in main to deactivate telemetry
export async function deactivate (): Promise<void> {
  await sentry.sentryClose()
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
