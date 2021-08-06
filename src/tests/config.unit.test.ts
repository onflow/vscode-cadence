const assert = require('assert')
import { Config } from '../config'

describe('Config', () => {
    it('creates config', () => {
        const c = new Config('flowCommand', 2, 'strict')

        assert.equal(c.accounts.length, 0)
    })
})