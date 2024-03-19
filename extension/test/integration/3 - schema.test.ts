import { MaxTimeout } from '../globals'
import { before, after } from 'mocha'
import * as assert from 'assert'
import * as vscode from 'vscode'
import { SemVer } from 'semver'
import { JSONSchemaProvider } from '../../src/json-schema-provider'
import * as fetch from 'node-fetch'
import { readFileSync } from 'fs'
import * as path from 'path'
import * as sinon from 'sinon'
import { CliProvider } from '../../src/flow-cli/cli-provider'
import { Subject } from 'rxjs'

suite('JSON schema tests', () => {
  let mockFlowVersionValue: SemVer | null = null
  let mockCliProvider: CliProvider
  let extensionPath: string
  let schemaProvider: JSONSchemaProvider

  let originalFetch: typeof fetch

  before(async function () {
    this.timeout(MaxTimeout)

    // Mock extension path
    extensionPath = path.resolve(__dirname, '../../../..')

    // Mock cli provider
    mockCliProvider = {
      currentBinary$: new Subject(),
      getCurrentBinary: sinon.stub().callsFake(async () => ((mockFlowVersionValue != null)
        ? {
            name: 'flow',
            version: mockFlowVersionValue
          }
        : null))
    } as any

    // Mock fetch (assertion is for linter workaround)
    originalFetch = fetch.default
    ;(fetch as unknown as any).default = async (url: string) => {
      // only mock valid response for version 1.0.0 for testing
      // other versions will return 404 and emulate a missing schema
      if (url === 'https://raw.githubusercontent.com/onflow/flow-cli/v1.0.0/flowkit/schema.json') {
        return {
          ok: true,
          text: async () => JSON.stringify({
            dummy: 'schema for flow.json'
          })
        } as any
      } else {
        return {
          ok: false,
          statusText: 'Not found'
        } as any
      }
    }

    // Initialize the schema provider
    schemaProvider = new JSONSchemaProvider(extensionPath, mockCliProvider)
  })

  after(async function () {
    this.timeout(MaxTimeout)

    // Restore fetch
    ;(fetch as unknown as any).default = originalFetch

    // Dispose the schema provider
    schemaProvider.dispose()
  })

  test('Defaults to local schema when version not found', async () => {
    mockFlowVersionValue = new SemVer('0.0.0')

    // Assert that the schema is the same as the local schema
    await vscode.workspace.fs.readFile(vscode.Uri.parse('cadence-schema:///flow.json')).then((data) => {
      assert.strictEqual(data.toString(), readFileSync(path.resolve(extensionPath, './flow-schema.json'), 'utf-8'))
    })
  }).timeout(MaxTimeout)

  test('Defaults to local schema when version is invalid', async () => {
    mockFlowVersionValue = null

    // Assert that the schema is the same as the local schema
    await vscode.workspace.fs.readFile(vscode.Uri.parse('cadence-schema:///flow.json')).then((data) => {
      assert.strictEqual(data.toString(), readFileSync(path.resolve(extensionPath, './flow-schema.json'), 'utf-8'))
    })
  }).timeout(MaxTimeout)

  test('Fetches remote schema for current CLI version', async () => {
    mockFlowVersionValue = new SemVer('1.0.0')

    // Assert that the schema is the same as the remote schema
    await vscode.workspace.fs.readFile(vscode.Uri.parse('cadence-schema:///flow.json')).then((data) => {
      assert.strictEqual(data.toString(), JSON.stringify({
        dummy: 'schema for flow.json'
      }))
    })
  }).timeout(MaxTimeout)
})
