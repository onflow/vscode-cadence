import * as assert from 'assert'
import { before, after } from 'mocha'
import { getMockSettings } from '../mock/mockSettings'
import { LanguageServerAPI } from '../../src/server/language-server'
import { FlowConfig } from '../../src/server/flow-config'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { of } from 'rxjs'
import { State } from 'vscode-languageclient'

suite('Language Server & Emulator Integration', () => {
  let LS: LanguageServerAPI
  let settings: Settings
  let mockConfig: FlowConfig

  before(async function () {
    this.timeout(MaxTimeout)
    // Initialize language server
    settings = getMockSettings()
    mockConfig = {
      fileModified$: of(),
      configPath$: of(),
      configPath: null
    } as any

    LS = new LanguageServerAPI(settings, mockConfig)
    await LS.activate()
  })

  after(async function () {
    this.timeout(MaxTimeout)
    await LS.deactivate()
  })

  test('Language Server Client', async () => {
    await LS.startClient()
    assert.notStrictEqual(LS.client, undefined)
    assert.equal(LS.client?.state, State.Running)
  })
})
