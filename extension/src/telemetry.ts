/* Error reporting using Sentry */
import * as Sentry from '@sentry/node'
import * as Type from '@sentry/types'

// Wrapper for Sentry API
export class Telemetry {
  static #activated: boolean

  constructor (activate: boolean) {
    Telemetry.#activated = activate
    this.#sentryInit()
  }

  async deactivate (): Promise<void> {
    await this.#sentryClose()
    Telemetry.#activated = false
  }

  #sentryInit (): void {
    if (!Telemetry.#activated) return
    Sentry.init({
      dsn: 'https://0d8301f1353343c199ec7f4968c0f763@o1308484.ingest.sentry.io/6553849',
      tracesSampleRate: 1.0,
      attachStacktrace: true
    })
  }

  async #sentryClose (): Promise<void> {
    if (!Telemetry.#activated) return
    void await Sentry.close()
  }

  static captureException (exception: any, captureContent?: Type.CaptureContext | undefined): void {
    if (!Telemetry.#activated) return
    const transaction = Sentry.startTransaction({
      op: 'Extension',
      name: 'Transaction'
    })
    Sentry.captureException(exception, captureContent)
    transaction.finish()
  }

  static setTags (tags: {[key: string]: Type.Primitive}): void {
    if (!Telemetry.#activated) return
    Sentry.setTags(tags)
  }
}
