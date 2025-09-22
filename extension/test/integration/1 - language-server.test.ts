import * as assert from 'assert'
import { before, after } from 'mocha'
import { getMockSettings } from '../mock/mockSettings'
import { LanguageServerAPI } from '../../src/server/language-server'
import { Settings } from '../../src/settings/settings'
import { MaxTimeout } from '../globals'
import { BehaviorSubject, Subject } from 'rxjs'
import { State } from 'vscode-languageclient'
import * as sinon from 'sinon'
import { SemVer } from 'semver'
import { CliBinary } from '../../src/flow-cli/cli-versions-provider'

suite('Language Server & Emulator Integration', () => {
  let LS: LanguageServerAPI
  let settings: Settings
  let fileModified$: Subject<void>
  let pathChanged$: Subject<string>
  let cliBinary$: BehaviorSubject<CliBinary>

  before(async function () {
    this.timeout(MaxTimeout)
    // Initialize language server
    settings = getMockSettings()
    fileModified$ = new Subject<void>()
    pathChanged$ = new Subject<string>()

    // create a mock cli provider without invokign the constructor
    cliBinary$ = new BehaviorSubject<CliBinary>({
      command: 'flow',
      version: new SemVer('1.0.0')
    })
    const mockCliProvider = {
      currentBinary$: cliBinary$,
      getCurrentBinary: sinon.stub().callsFake(async () => cliBinary$.getValue())
    } as any

    LS = new LanguageServerAPI(settings, mockCliProvider)
    // Stub out actual client start to avoid spawning real flow binary on CI
    const fakeClient: any = {
      state: State.Running,
      stop: async () => { fakeClient.state = State.Stopped },
      dispose: async () => {}
    }
    sinon.stub(LS, 'startClient').callsFake(async () => {
      ;(LS as any).client = fakeClient
      LS.clientState$.next(State.Running)
    })
    await LS.activate()
  })

  after(async function () {
    this.timeout(MaxTimeout)
    await LS.deactivate()
  })

  test('Language Server Client', async () => {
    assert.notStrictEqual(LS.client, undefined)
    assert.equal(LS.client?.state, State.Running)
  })

  test('Deactivate Language Server Client', async () => {
    const client = LS.client
    await LS.deactivate()

    // Check that client remains stopped even if CLI binary changes
    cliBinary$.next({
      command: 'flow',
      version: new SemVer('1.0.1')
    })

    assert.equal(client?.state, State.Stopped)
    assert.equal(LS.client, null)
    assert.equal(LS.clientState$.getValue(), State.Stopped)
  })
})
