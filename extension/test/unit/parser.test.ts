import { parseFlowCliVersion } from '../../src/utils/flow-version'
import { ASSERT_EQUAL } from '../globals'

suite('Parsing Unit Tests', () => {
  test('Flow CLI Version Parsing', async () => {
    let versionTest: Buffer = Buffer.from('Version: v0.1.0\nCommit: 0a1b2c3d')
    let formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, 'v0.1.0')

    versionTest = Buffer.from('Version: v0.1.0')
    formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, 'v0.1.0')
  })
})
