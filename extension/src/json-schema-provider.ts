import * as vscode from 'vscode'
import { readFile } from 'fs'
import { promisify } from 'util'
import { resolve } from 'path'
import { SemVer } from 'semver'
import fetch from 'node-fetch'
import { StateCache } from './utils/state-cache'
import { Subscription } from 'rxjs'

const GET_FLOW_SCHEMA_URL = (version: SemVer): string => `https://raw.githubusercontent.com/onflow/flow-cli/v${version.format()}/flowkit/flow-schema.json`

// This class provides the JSON schema for the flow.json file
// It is accessible via the URI scheme "cadence-schema:///flow.json"
export class JSONSchemaProvider implements vscode.FileSystemProvider, vscode.Disposable {
  static CADENCE_SCHEMA_URI = 'cadence-schema'
  static #instance: JSONSchemaProvider

  #contentProviderDisposable: vscode.Disposable | undefined
  #flowVersionSubscription: Subscription
  flowVersion: StateCache<SemVer | null>
  flowSchema: StateCache<string> = new StateCache(async () => await this.#resolveFlowSchema())

  static register (ctx: vscode.ExtensionContext, flowVersion: StateCache<SemVer | null>): void {
    if (JSONSchemaProvider.#instance) {
      JSONSchemaProvider.#instance.dispose()
    }

    // Create a provider for the flow-schema URI scheme, this will be deactivated when the extension is deactivated
    JSONSchemaProvider.#instance = new JSONSchemaProvider(
      ctx,
      flowVersion,
      {dispose: () => contentProviderDisposable.dispose()}
    )
    const contentProviderDisposable = vscode.workspace.registerFileSystemProvider(
      JSONSchemaProvider.CADENCE_SCHEMA_URI,
      JSONSchemaProvider.#instance
    )
    ctx.subscriptions.push(
      JSONSchemaProvider.#instance,
    )
  }

  static get instance (): JSONSchemaProvider {
    return JSONSchemaProvider.#instance
  }

  private constructor (
    private readonly ctx: vscode.ExtensionContext,
    flowVersion: StateCache<SemVer | null>,
    contentProviderDisposable: vscode.Disposable
  ) {
    this.flowVersion = flowVersion
    this.#contentProviderDisposable = contentProviderDisposable

    // Invalidate the schema when the flow-cli version changes
    this.#flowVersionSubscription = this.flowVersion.subscribe(
      () => this.flowSchema.invalidate()
    )
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    try {
      if (uri.path === '/flow.json') {
        return Buffer.from(await this.flowSchema.getValue(), "utf-8")
      } else {
        throw new Error('Unknown schema')
      }
    } catch(e) {
      console.error(e)
      return Buffer.from([])
    }
  }

  async dispose (): Promise<void> {
    if (this.#contentProviderDisposable) {
      await this.#contentProviderDisposable.dispose()
    }
    this.#flowVersionSubscription.unsubscribe()
  }

  async #resolveFlowSchema (): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 0))
    const res = await this.flowVersion.getValue().then(async (cliVersion) => {
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
    return res
  }

  // Unsupported file system provider methods
  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>().event
  watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[] }): vscode.Disposable {
    throw new Error('Method not implemented.')
  }
  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    throw new Error('Method not implemented.')
  }
  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    throw new Error('Method not implemented.')
  }
  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }
  writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean }): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }
  delete(uri: vscode.Uri, options: { readonly recursive: boolean }): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }
  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean }): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }
  copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean }): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }
}
