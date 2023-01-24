/* VS Code Cadence Extension entry point */
import { ExtensionContext, debug, DebugAdapterServer } from 'vscode'
import { Extension } from './extension'
import * as Telemetry from './telemetry/telemetry'

// Global extension variable to update UI
export let ext: Extension

// Called by VS Code when the extension starts up
export async function activate (ctx: ExtensionContext): Promise<Extension> {
  await Telemetry.initialize(ctx)

  debug.registerDebugAdapterDescriptorFactory('cadence', {
    createDebugAdapterDescriptor: (_session) => {
      return new DebugAdapterServer(2345)
    }
  })

  // Initialize the extension
  Telemetry.withTelemetry(() => {
    ext = Extension.initialize(ctx)
    void ext.emulatorStateChanged()
  })

  return ext
}

// Called by VS Code when the extension terminates
export function deactivate (): Thenable<void> | undefined {
  void Telemetry.deactivate()
  return (ext === undefined ? undefined : ext.deactivate())
}
