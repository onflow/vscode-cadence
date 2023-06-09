import { fetchConfig, getAccountKey } from '../../src/emulator/local/flowConfig'
import * as assert from 'assert'
import * as path from 'path'

const flowJsonPath = path.join(__dirname, '../integration/fixtures/workspace/flow.json')

suite('Flow Config Tests', () => {
  test('Loading', async () => {
    const config = await fetchConfig(flowJsonPath)
    assert.strictEqual(JSON.stringify(config.accounts), '{"emulator-account":{"address":"f8d6e0586b0a20c7","key":"d2f9b3e122aa5289fb38edab611c8d1c2aa88d6fd8e3943a306a493361639812"}}')
    assert.strictEqual(JSON.stringify(config.contracts), '{}')
    assert.strictEqual(JSON.stringify(config.deployments), '{}')
    assert.strictEqual(JSON.stringify(config.emulators), '{"default":{"port":3569,"serviceAccount":"emulator-account"}}')
    assert.strictEqual(JSON.stringify(config.networks), '{"emulator":"127.0.0.1:3569","mainnet":"access.mainnet.nodes.onflow.org:9000","testnet":"access.devnet.nodes.onflow.org:9000"}')
  })

  test('Get Account key', async () => {
    const key = await getAccountKey('emulator-account', flowJsonPath)
    assert.strictEqual(key, 'd2f9b3e122aa5289fb38edab611c8d1c2aa88d6fd8e3943a306a493361639812')
  })
})
