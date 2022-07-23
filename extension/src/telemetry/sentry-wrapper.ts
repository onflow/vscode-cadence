/* Wrapper functions for error reporting using Sentry */
import * as Sentry from '@sentry/node'
import * as Type from '@sentry/types'

// Sentry vscode-cadence
const SENTRY_DSN: string = 'https://4d98c4d4ac7e4892850f8e3d2e61c733@o114654.ingest.sentry.io/6568410'

// True when sentry telemetry is active
let sentryActivated: boolean = false

export function sentryInit (activate: boolean): void {
  sentryActivated = activate
  if (!sentryActivated) return
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
    attachStacktrace: true
  })
}

export async function sentryClose (): Promise<void> {
  if (!sentryActivated) return
  void await Sentry.close()
}

export function captureException (exception: any, captureContent?: Type.CaptureContext | undefined): void {
  if (!sentryActivated) return
  const transaction = Sentry.startTransaction({
    name: exception.message as string
  })
  Sentry.captureException(exception, captureContent)
  transaction.finish()
}
