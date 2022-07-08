/* VS Code Cadence Extension entry point */
import { ExtensionContext } from 'vscode'
import { Extension } from './extension'
import { Settings } from './settings/settings'
import { Telemetry } from './telemetry'

// Global extension variable to update UI
export let ext: Extension

// Error handler
let telemetry: Telemetry

// Called by VS Code when the extension starts up
export async function activate (ctx: ExtensionContext): Promise<void> {
  const settings = Settings.getWorkspaceSettings()

  // Initialize Sentry error handling
  telemetry = new Telemetry(settings.activateTelemetry)

  // Initialize the extension
  try {
    ext = Extension.initialize(ctx)
  } catch (e) {
    Telemetry.captureException(e)
  }
}

// Called by VS Code when the extension terminates
export function deactivate (): Thenable<void> | undefined {
  void telemetry.deactivate()
  if (ext === undefined) {
    return undefined
  }
  return ext.emulatorCtrl.api === undefined ? undefined : ext.emulatorCtrl.api.client.stop()
}
