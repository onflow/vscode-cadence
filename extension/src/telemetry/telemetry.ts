/* Telemetry functions */
import * as sentry from './sentry-wrapper'
import { Settings } from '../settings/settings'
import { env } from 'vscode'

// Called in main to setup telemetry
export function initialize (): void {
  // Check if user is allowing telemetry for our extension and vscode globally
  const settings = Settings.getWorkspaceSettings()
  const activate: boolean = settings.activateTelemetry && env.isTelemetryEnabled

  // Initialize Sentry
  sentry.sentryInit(activate)
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
