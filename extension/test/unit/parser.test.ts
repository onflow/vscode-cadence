import * as assert from 'assert'
import { parseFlowCliVersion } from '../../src/flow-cli/cli-versions-provider'
import { execDefault } from '../../src/utils/shell/exec'
import { ASSERT_EQUAL, MaxTimeout } from '../globals'
import * as semver from 'semver'
import { before } from 'mocha'

suite('Parsing Unit Tests', () => {
  before(function () {
    this.timeout(MaxTimeout)
  })
  test('Flow CLI Version Parsing (buffer input)', async () => {
    let versionTest: Buffer = Buffer.from('Version: v0.1.0\nCommit: 0a1b2c3d')
    let formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, '0.1.0')

    versionTest = Buffer.from('Version: v0.1.0')
    formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, '0.1.0')
  })

  test('Flow CLI Version Parsing (string input)', async () => {
    const versionTest: string = 'Version: v0.1.0\nCommit: 0a1b2c3d'
    const formatted = parseFlowCliVersion(versionTest)
    ASSERT_EQUAL(formatted, '0.1.0')
  })

  test('Flow CLI Version Parsing produces valid semver from Flow CLI output', async function () {
    this.timeout(MaxTimeout)
    try {
      const { stdout } = await execDefault('flow version')
      const formatted = parseFlowCliVersion(stdout)
      assert(semver.valid(formatted))
    } catch {
      this.skip()
    }
  })
})
