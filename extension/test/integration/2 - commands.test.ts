import { getMockSettings } from '../mock/mockSettings'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { before, after } from 'mocha'
import * as assert from 'assert'
import { ext, testActivate } from '../../src/main'
import * as commands from '../../src/commands/command-constants'

suite('Extension Commands', () => {
  let settings: Settings

  before(async function () {
    this.timeout(MaxTimeout)
    settings = getMockSettings()
    await testActivate(settings)
  })

  after(async function () {
    this.timeout(MaxTimeout)
    await ext?.deactivate()
  })

  test('Command: Check Dependencies', async () => {
    assert.strictEqual(await ext?.executeCommand(commands.CHECK_DEPENDENCIES), true)
  }).timeout(MaxTimeout)
})
