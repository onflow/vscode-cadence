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
      // vscode-cadence
      dsn: "https://4d98c4d4ac7e4892850f8e3d2e61c733@o114654.ingest.sentry.io/6568410",
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
