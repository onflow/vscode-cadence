/* Wrapper functions for error reporting using Sentry */
import * as Sentry from '@sentry/node'
import * as Type from '@sentry/types'

// Sentry vscode-cadence
const SENTRY_DSN: string = 'https://4d98c4d4ac7e4892850f8e3d2e61c733@o114654.ingest.sentry.io/6568410'

// True when sentry telemetry is active
let sentryActivated: boolean = false

export async function sentryInit (activate: boolean): Promise<void> {
  sentryActivated = activate
  if (!sentryActivated) return
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
    attachStacktrace: true
  })
}

export function setUser (id: string): void {
  Sentry.setUser({ id: id })
}

export async function sentryClose (): Promise<void> {
  if (!sentryActivated) return
  void await Sentry.close()
}

export function captureException (exception: any, captureContent?: Type.CaptureContext | undefined): void {
  if (!sentryActivated) return
  Sentry.captureException(exception, captureContent)
}

export function captureStatistics (message: string): void {
  if (!sentryActivated) return
  Sentry.captureMessage(message, 'info')
}
