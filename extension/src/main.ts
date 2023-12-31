/* VS Code Cadence Extension entry point */
import { ExtensionContext, debug, DebugAdapterServer } from 'vscode'
import { Extension } from './extension'
import * as Telemetry from './telemetry/telemetry'
import { Settings } from './settings/settings'

// Global extension variable to update UI
export let ext: Extension | null = null

// Called by VS Code when the extension starts up
export async function activate (ctx: ExtensionContext): Promise<Extension | null> {
  await Telemetry.initialize(ctx)

  debug.registerDebugAdapterDescriptorFactory('cadence', {
    createDebugAdapterDescriptor: (_session) => {
      return new DebugAdapterServer(2345)
    }
  })

  // Initialize the extension
  Telemetry.withTelemetry(() => {
    const settings = new Settings()
    ext = Extension.initialize(settings, ctx)
  })

  return ext
}

// Called by VS Code when the extension terminates
export function deactivate (): Thenable<void> | undefined {
  void Telemetry.deactivate()
  return (ext === undefined ? undefined : ext?.deactivate())
}

export async function testActivate (settings: Settings): Promise<Extension> {
  ext = Extension.initialize(settings)
  return ext
}
