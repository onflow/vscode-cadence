import { MaxTimeout } from '../globals'
import { before, after } from 'mocha'
import * as assert from 'assert'
import * as vscode from 'vscode'
import { StateCache } from '../../src/utils/state-cache'
import { SemVer } from 'semver'
import { JSONSchemaProvider } from '../../src/json-schema-provider'
import * as fetch from 'node-fetch'
import { readFileSync } from 'fs'
import * as path from 'path'

suite('JSON schema tests', () => {
  let mockFlowVersionValue: SemVer | null = null
  let mockFlowVersion: StateCache<SemVer | null>
  let mockContext: vscode.ExtensionContext

  let originalFetch: typeof fetch

  before(async function () {
    this.timeout(MaxTimeout)

    // Mock extension context
    mockContext = {
      extensionPath: path.resolve(__dirname, '../../../..'),
      subscriptions: [] as vscode.Disposable[]
    } as any

    // Mock flow version
    mockFlowVersion = new StateCache<SemVer | null>(async () => mockFlowVersionValue)

    // Mock fetch (assertion is for linter workaround)
    originalFetch = fetch.default
    ;(fetch as unknown as any).default = async (url: string) => {
      // only mock valid response for version 1.0.0 for testing
      // other versions will return 404 and emulate a missing schema
      if (url === 'https://raw.githubusercontent.com/onflow/flow-cli/v1.0.0/flowkit/flow-schema.json') {
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
    JSONSchemaProvider.register(mockContext, mockFlowVersion)
  })

  after(async function () {
    this.timeout(MaxTimeout)

    // Restore fetch (assertion is for linter workaround)
    ;(fetch as unknown as any).default = originalFetch

    // Clear subscriptions
    mockContext.subscriptions.forEach((sub) => sub.dispose())
    ;(mockContext as any).subscriptions = []
  })

  test('Defaults to local schema when version not found', async () => {
    mockFlowVersionValue = new SemVer('0.0.0')
    mockFlowVersion.invalidate()

    // Assert that the schema is the same as the local schema
    await vscode.workspace.fs.readFile(vscode.Uri.parse('cadence-schema:///flow.json')).then((data) => {
      assert.strictEqual(data.toString(), readFileSync(path.resolve(mockContext.extensionPath, './flow-schema.json'), 'utf-8'))
    })
  }).timeout(MaxTimeout)

  test('Defaults to local schema when version is invalid', async () => {
    mockFlowVersionValue = null
    mockFlowVersion.invalidate()

    // Assert that the schema is the same as the local schema
    await vscode.workspace.fs.readFile(vscode.Uri.parse('cadence-schema:///flow.json')).then((data) => {
      assert.strictEqual(data.toString(), readFileSync(path.resolve(mockContext.extensionPath, './flow-schema.json'), 'utf-8'))
    })
  }).timeout(MaxTimeout)

  test('Fetches remote schema for current CLI version', async () => {
    mockFlowVersionValue = new SemVer('1.0.0')
    mockFlowVersion.invalidate()

    // Assert that the schema is the same as the remote schema
    await vscode.workspace.fs.readFile(vscode.Uri.parse('cadence-schema:///flow.json')).then((data) => {
      assert.strictEqual(data.toString(), JSON.stringify({
        dummy: 'schema for flow.json'
      }))
    })
  }).timeout(MaxTimeout)
})
