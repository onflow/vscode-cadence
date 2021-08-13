import { Account } from '../../account'
import * as assert from 'assert'

describe('AccountUnitTest', () => {
  it('creates an account', () => {
    const a1 = new Account('Foo', '0x1')
    a1.setIndex(2)

    assert.strictEqual(a1.address, '0x1')
    assert.strictEqual(a1.name, 'Foo')
    assert.strictEqual(a1.getName(), a1.name)
    assert.strictEqual(a1.fullName(), `${a1.name} (${a1.address})`)
    assert.strictEqual(a1.index, 2)

    assert.strictEqual(a1.getAddress(), '0x1')
    assert.strictEqual(a1.getAddress(false), '1')

    a1.address = '1'
    assert.strictEqual(a1.getAddress(), '0x1')
    assert.strictEqual(a1.getAddress(false), '1')
  })
})
