import * as vscode from 'vscode'
import { readFile } from 'fs'
import { promisify } from 'util'
import { resolve } from 'path'
import fetch from 'node-fetch'
import { CliProvider } from './flow-cli/cli-provider'

const CADENCE_SCHEMA_URI = 'cadence-schema'
const GET_FLOW_SCHEMA_URL = (version: string): string => `https://raw.githubusercontent.com/onflow/flowkit/v${version}/schema.json`

// This class provides the JSON schema for the flow.json file
// It is accessible via the URI scheme "cadence-schema:///flow.json"
export class JSONSchemaProvider implements vscode.FileSystemProvider, vscode.Disposable {
  #contentProviderDisposable: vscode.Disposable | undefined
  #extensionPath: string
  #cliProvider: CliProvider
  #schemaCache: { [version: string]: Promise<string> } = {}

  constructor (
    extensionPath: string,
    cliProvider: CliProvider
  ) {
    this.#extensionPath = extensionPath
    this.#cliProvider = cliProvider

    // Register the schema provider
    this.#contentProviderDisposable = vscode.workspace.registerFileSystemProvider(
      CADENCE_SCHEMA_URI,
      this
    )
  }

  async #getFlowSchema (): Promise<string> {
    const cliBinary = await this.#cliProvider.getCurrentBinary()
    if (cliBinary == null) {
      void vscode.window.showWarningMessage('Cannot get flow-cli version, using local schema instead.  Please install flow-cli to get the latest schema.')
      return await this.getLocalSchema()
    }

    const flowkitVersion = cliBinary.flowkitVersion.format()
    if (this.#schemaCache[flowkitVersion] == null) {
      // Try to get schema from flowkit repo based on the flowkit version
      this.#schemaCache[flowkitVersion] = fetch(GET_FLOW_SCHEMA_URL(flowkitVersion)).then(async (response: Response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch schema for flowkit version ${flowkitVersion}`)
        }
        return await response.text()
      }).catch(async () => {
        void vscode.window.showWarningMessage('Failed to fetch flow.json schema from flowkit repo, using local schema instead.  Please update flow-cli to the latest version to get the latest schema.')
        return await this.getLocalSchema()
      })
    }

    return await this.#schemaCache[flowkitVersion]
  }

  async getLocalSchema (): Promise<string> {
    const schemaUrl = resolve(this.#extensionPath, 'flow-schema.json')
    return await promisify(readFile)(schemaUrl).then(x => x.toString())
  }

  async readFile (uri: vscode.Uri): Promise<Uint8Array> {
    if (uri.path === '/flow.json') {
      const schema = await this.#getFlowSchema()
      return Buffer.from(schema)
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
        size: await this.#getFlowSchema().then(x => x.length)
      }
    } else {
      throw new Error('Unknown schema')
    }
  }

  dispose (): void {
    if (this.#contentProviderDisposable != null) {
      this.#contentProviderDisposable.dispose()
    }
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
