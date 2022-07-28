/* VS Code Cadence Extension entry point */
import { ExtensionContext } from 'vscode'
import { Extension } from './extension'
import * as Telemetry from './telemetry/telemetry'

// Global extension variable to update UI
export let ext: Extension

// Called by VS Code when the extension starts up
export async function activate (ctx: ExtensionContext): Promise<void> {
  Telemetry.initialize()

  // Initialize the extension
  Telemetry.withTelemetry(() => {
    ext = Extension.initialize(ctx)
    void ext.emulatorStateChanged()
  })
}

// Called by VS Code when the extension terminates
export function deactivate (): Thenable<void> | undefined {
  void Telemetry.deactivate()
  return (ext === undefined ? undefined : ext.deactivate())
}
