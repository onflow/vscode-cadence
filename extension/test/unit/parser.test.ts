import { extractFlowCLIVersion } from '../../src/utils/flow-version'
import { ASSERT_EQUAL } from '../globals'

suite('Parsing Unit Tests', () => {
  test('Flow CLI Version Extraction', async () => {
    let versionTest: Buffer = Buffer.from('Foobar123\nVersion: v0.1.0\nCommit: 0a1b2c3d')
    let formatted = extractFlowCLIVersion(versionTest)
    ASSERT_EQUAL(formatted, '0.1.0')

    versionTest = Buffer.from('Version: v0.1.0')
    formatted = extractFlowCLIVersion(versionTest)
    ASSERT_EQUAL(formatted, '0.1.0')
  })

  test('Flow CLI Version Extraction (Fallback)', async () => {
    let versionTest: Buffer = Buffer.from('somethingtobreak the code\nv0.1.0\nCommit: 0a1b2c3d')
    let formatted = extractFlowCLIVersion(versionTest)
    ASSERT_EQUAL(formatted, '0.1.0')

    versionTest = Buffer.from('v0.1.0')
    formatted = extractFlowCLIVersion(versionTest)
    ASSERT_EQUAL(formatted, '0.1.0')
  })
})
