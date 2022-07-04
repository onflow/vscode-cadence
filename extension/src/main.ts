/* VS Code Cadence Extension entry point */
import { ExtensionContext } from 'vscode'
import { Extension } from './extension'

// Global extension variable to update UI
export let ext: Extension

// Called by VS Code when the extension starts up
export async function activate (ctx: ExtensionContext): Promise<void> {
  // Initialize the extension
  ext = Extension.initialize(ctx)
}

// Called by VS Code when the extension terminates
export function deactivate (): Thenable<void> | undefined {
  return ext.emulatorCtrl.api === undefined ? undefined : ext.emulatorCtrl.api.client.stop()
}
