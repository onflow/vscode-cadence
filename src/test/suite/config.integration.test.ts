import { Config } from '../../config'
import * as assert from 'assert'

suite('Config', () => {
  test('creates config', () => {
    const c = new Config('flowCommand', 2, 'strict')

    assert.strictEqual(c.accounts.length, 0)
  })
})
