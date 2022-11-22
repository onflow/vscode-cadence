import { parseFlowCliVersion } from '../../src/dependency-installer/installers/version-parsers'
import { ASSERT_EQUAL } from './test-utils'

describe('Parser function tests', () => {
  it('flow-cli version parsing', () => {
    let versionTest: Buffer = Buffer.from('Version: v0.1.0\nCommit: 0a1b2c3d')
    let formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, 'v0.1.0')

    versionTest = Buffer.from('Version: v0.1.0')
    formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, 'v0.1.0')
  })
})
