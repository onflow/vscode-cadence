import * as assert from 'assert'
import { before, after } from 'mocha'
import { getMockSettings } from '../mock/mockSettings'
import { LanguageServerAPI } from '../../src/emulator/server/language-server'
import { setConfigPath } from '../../src/emulator/local/flowConfig'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'

suite('Language Server & Emulator Integration', () => {
  let LS: LanguageServerAPI
  let settings: Settings

  before(async function () {
    this.timeout(MaxTimeout)
    // Initialize language server
    settings = getMockSettings()
    setConfigPath(settings.customConfigPath)
    LS = new LanguageServerAPI(settings)
    await LS.activate()
  })

  after(async function () {
    this.timeout(MaxTimeout)
    await LS.deactivate()
  })

  test('Language Server Client', async () => {
    await LS.startClient()
    assert.notStrictEqual(LS.client, undefined)
    assert.strictEqual(LS.client?.isRunning(), true)
  })
})
