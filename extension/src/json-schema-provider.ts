import * as vscode from 'vscode'
import { readFile } from 'fs'
import { promisify } from 'util'
import { resolve } from 'path'
import { SemVer } from 'semver'
import fetch from 'node-fetch'
import { StateCache } from './utils/state-cache'
import { flowVersion } from './utils/flow-version'

const GET_FLOW_SCHEMA_URL = (version: SemVer): string => `https://raw.githubusercontent.com/onflow/flow-cli/v${version.format()}/flowkit/flow-schema.json`

// This class provides the JSON schema for the flow.json file
// It is accessible via the URI scheme "cadence-schema://flow.json"
export class JSONSchemaProvider implements vscode.TextDocumentContentProvider {
  static CADENCE_SCHEMA_URI = 'cadence-schema'
  static #instance: JSONSchemaProvider

  flowSchema: StateCache<string> = new StateCache(async () => await this.#resolveFlowSchema())

  static register (ctx: vscode.ExtensionContext): void {
    // Create a provider for the flow-schema URI scheme, this will be deactivated when the extension is deactivated
    JSONSchemaProvider.#instance = new JSONSchemaProvider(ctx)
    ctx.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        JSONSchemaProvider.CADENCE_SCHEMA_URI,
        JSONSchemaProvider.#instance
      )
    )
  }

  static get instance (): JSONSchemaProvider {
    return JSONSchemaProvider.#instance
  }

  private constructor (private readonly ctx: vscode.ExtensionContext) {
    // Invalidate the schema when the flow-cli version changes
    flowVersion.subscribe(() => this.flowSchema.invalidate())
  }

  async #resolveFlowSchema (): Promise<string> {
    return await flowVersion.getValue().then(async (cliVersion) => {
      // Verify that version is valid
      if (cliVersion == null) throw new Error('Failed to get flow-cli version, please make sure flow-cli is installed and in your PATH')

      // Try to get schema from flow-cli repo based on the flow-cli version
      return fetch(GET_FLOW_SCHEMA_URL(cliVersion))
    }).then(async (response: Response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch schema from flow-cli repo: ${response.statusText}`)
      }
      return await response.text()
    }).catch(async () => {
      // Fallback to local schema
      void vscode.window.showWarningMessage('Failed to fetch schema from flow-cli repo, using local schema instead.  Please update flow-cli to the latest version to get the latest schema.')
      const schemaUrl = resolve(this.ctx.extensionPath, 'flow-schema.json')
      return await promisify(readFile)(schemaUrl).then(x => x.toString())
    })
  }

  provideTextDocumentContent (uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
    if (uri.path === '/flow.json') {
      return this.flowSchema.getValue()
    } else {
      throw new Error('Unknown schema')
    }
  }
}
