import * as vscode from 'vscode'
import { readFile } from 'fs'
import { promisify } from 'util'
import { resolve } from 'path'
import { SemVer } from 'semver'
import fetch from 'node-fetch'
import { StateCache } from './utils/state-cache'
import { Subscription } from 'rxjs'

const GET_FLOW_SCHEMA_URL = (version: SemVer): string => `https://raw.githubusercontent.com/onflow/flow-cli/v${version.format()}/flowkit/schema.json`

// This class provides the JSON schema for the flow.json file
// It is accessible via the URI scheme "cadence-schema:///flow.json"
export class JSONSchemaProvider implements vscode.FileSystemProvider, vscode.Disposable {
  static CADENCE_SCHEMA_URI = 'cadence-schema'
  static #instance: JSONSchemaProvider | null

  #contentProviderDisposable: vscode.Disposable | undefined
  #flowVersionSubscription: Subscription
  #flowVersion: StateCache<SemVer | null>
  #flowSchema: StateCache<string>
  #showLocalError: boolean = false

  static register (ctx: vscode.ExtensionContext, flowVersion: StateCache<SemVer | null>): void {
    if (JSONSchemaProvider.#instance != null) {
      JSONSchemaProvider.#instance.dispose()
    }

    // Create a provider for the cadence-schema URI scheme, this will be deactivated when the extension is deactivated
    JSONSchemaProvider.#instance = new JSONSchemaProvider(
      ctx,
      flowVersion,
      { dispose: () => contentProviderDisposable.dispose() }
    )
    const contentProviderDisposable = vscode.workspace.registerFileSystemProvider(
      JSONSchemaProvider.CADENCE_SCHEMA_URI,
      JSONSchemaProvider.#instance
    )
    ctx.subscriptions.push(
      JSONSchemaProvider.#instance
    )
  }

  private constructor (
    private readonly ctx: vscode.ExtensionContext,
    flowVersion: StateCache<SemVer | null>,
    contentProviderDisposable: vscode.Disposable
  ) {
    this.#flowVersion = flowVersion
    this.#contentProviderDisposable = contentProviderDisposable
    this.#flowSchema = new StateCache(async () => await this.#resolveFlowSchema())

    // Invalidate the schema when the flow-cli version changes
    this.#flowVersionSubscription = this.#flowVersion.subscribe(
      () => this.#flowSchema.invalidate()
    )
  }

  async readFile (uri: vscode.Uri): Promise<Uint8Array> {
    if (uri.path === '/flow.json') {
      const schema = await this.#flowSchema.getValue()
      if (this.#showLocalError) {
        void vscode.window.showWarningMessage('Failed to fetch flow.json schema from flow-cli repo, using local schema instead.  Please update flow-cli to the latest version to get the latest schema.')
        this.#showLocalError = false
      }
      return Buffer.from(schema, 'utf-8')
    } else {
      throw new Error('Unknown schema')
    }
  }

  async stat (uri: vscode.Uri): Promise<vscode.FileStat> {
    if (uri.path === '/flow.json') {
      // Mocked values
      return {
        type: vscode.FileType.File,
        ctime: 0,
        mtime: 0,
        size: await this.#flowSchema.getValue().then(x => x.length)
      }
    } else {
      throw new Error('Unknown schema')
    }
  }

  dispose (): void {
    if (this.#contentProviderDisposable != null) {
      this.#contentProviderDisposable.dispose()
    }
    this.#flowVersionSubscription.unsubscribe()
  }

  async #resolveFlowSchema (): Promise<string> {
    return await this.#flowVersion.getValue().then(async (cliVersion) => {
      // Verify that version is valid (could be null if flow-cli is not installed, etc.)
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
      this.#showLocalError = true
      const schemaUrl = resolve(this.ctx.extensionPath, 'flow-schema.json')
      return await promisify(readFile)(schemaUrl).then(x => x.toString())
    })
  }

  // Unsupported file system provider methods
  // These methods are required to implement the vscode.FileSystemProvider interface
  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>().event
  watch (uri: vscode.Uri, options: { readonly recursive: boolean, readonly excludes: readonly string[] }): vscode.Disposable {
    throw new Error('Method not implemented.')
  }

  readDirectory (uri: vscode.Uri): Array<[string, vscode.FileType]> | Thenable<Array<[string, vscode.FileType]>> {
    throw new Error('Method not implemented.')
  }

  createDirectory (uri: vscode.Uri): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }

  writeFile (uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean, readonly overwrite: boolean }): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }

  delete (uri: vscode.Uri, options: { readonly recursive: boolean }): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }

  rename (oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean }): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }

  copy? (source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean }): void | Thenable<void> {
    throw new Error('Method not implemented.')
  }
}
