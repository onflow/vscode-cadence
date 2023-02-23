import * as assert from 'assert'
import { before } from 'mocha'
import { delay } from '../index'
import { getMockSettings } from '../mock/mockSettings'
import { LanguageServerAPI } from '../../src/emulator/server/language-server'
import * as flowConfig from '../../src/emulator/local/flowConfig'

// TODO: Package with flow binary and call that instead of 'flow'?
// TODO: Or can we test the installer and make sure that's working as well?

suite ('Language Server Integration Tests', () => {
  var LS: LanguageServerAPI

  before(async () => {
    const settings = getMockSettings()
    flowConfig.setConfigPath(settings.customConfigPath)

    LS = new LanguageServerAPI(settings)
  })

  test('Language Server Initialization Test', async () => {
    await LS.startClient(false)
  
    delay(10)

    assert.notStrictEqual(LS.client, undefined)
    assert.strictEqual(LS.client?.isRunning(), true)
    assert.strictEqual(LS.emulatorConnected(), false)

    console.log("LS Client Running: ", LS.client?.isRunning())    
  })

  test('Connect Emulator', async () => {
    console.log("LS Client Running: ", LS.client?.isRunning())

    // TODO: Start emulator in same directory
    //assert.strictEqual(LS.emulatorConnected(), true)
  })

})

