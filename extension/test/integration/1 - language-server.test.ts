import * as assert from 'assert'
import { before, after } from 'mocha'
import { getMockSettings } from '../mock/mockSettings'
import { LanguageServerAPI } from '../../src/server/language-server'
import { FlowConfig } from '../../src/server/flow-config'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { Subject } from 'rxjs'
import { State } from 'vscode-languageclient'

suite('Language Server & Emulator Integration', () => {
  let LS: LanguageServerAPI
  let settings: Settings
  let mockConfig: FlowConfig
  let fileModified$: Subject<void>
  let pathChanged$: Subject<string>

  before(async function () {
    this.timeout(MaxTimeout)
    // Initialize language server
    settings = getMockSettings()
    fileModified$ = new Subject<void>()
    pathChanged$ = new Subject<string>()
    mockConfig = {
      fileModified$,
      pathChanged$,
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

  test('Deactivate Language Server Client', async () => {
    const client = LS.client
    await LS.deactivate()

    // Check that client remains stopped even if config changes
    fileModified$.next()
    pathChanged$.next('foo')

    assert.equal(client?.state, State.Stopped)
    assert.equal(LS.client, null)
    assert.equal(LS.clientState$.getValue(), State.Stopped)
  })
})
