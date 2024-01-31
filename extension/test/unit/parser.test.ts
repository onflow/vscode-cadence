import * as assert from 'assert'
import { parseFlowCliVersion } from '../../src/flow-cli/flow-version-provider'
import { execDefault } from '../../src/utils/shell/exec'
import { ASSERT_EQUAL } from '../globals'
import * as semver from 'semver'

suite('Parsing Unit Tests', () => {
  test('Flow CLI Version Parsing Buffer', async () => {
    let versionTest: Buffer = Buffer.from('Version: v0.1.0\nCommit: 0a1b2c3d')
    let formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, 'v0.1.0')

    versionTest = Buffer.from('Version: v0.1.0')
    formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, 'v0.1.0')
  })

  test('FLow CLI Version Parsing string', async () => {
    let versionTest: string = 'Version: v0.1.0\nCommit: 0a1b2c3d'
    let formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, 'v0.1.0')
  })

  test('Flow CLI Version Parsing Integration', async () => {
    // Check that version is parsed from currently installed flow-cli
    const {stdout} = await execDefault('flow version')
    const formatted = parseFlowCliVersion(stdout)
    assert(semver.valid(formatted))
  })
})
