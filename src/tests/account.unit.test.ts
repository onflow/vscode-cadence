const assert = require('assert')
import { Account } from '../account'

describe('AccountUnitTest', () => {
    it('creates an account', () => {
        const a1 = new Account('Foo', '0x1')
        a1.setIndex(2)

        assert.equal(a1.address, '0x1')
        assert.equal(a1.name, 'Foo')
        assert.equal(a1.getName(), a1.name)
        assert.equal(a1.fullName(), `${a1.name} (${a1.address})`)
        assert.equal(a1.index, 2)
    })
})