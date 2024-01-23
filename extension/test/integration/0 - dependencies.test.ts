import * as assert from 'assert'
import { DependencyInstaller } from '../../src/dependency-installer/dependency-installer'
import { MaxTimeout } from '../globals'
import { InstallFlowCLI } from '../../src/dependency-installer/installers/flow-cli-installer'
import { stub } from 'sinon'
import { before } from 'mocha'
import { FlowVersionProvider } from '../../src/flow-cli/flow-version-provider'
import { getMockSettings } from '../mock/mockSettings'

// Note: Dependency installation must run before other integration tests
suite('Dependency Installer', () => {
  let flowVersionProvider: any

  before(async function () {
    flowVersionProvider = new FlowVersionProvider(getMockSettings())
  })

  test('Install Missing Dependencies', async () => {
    const mocklanguageServerApi = {
      activate: stub(),
      deactivate: stub(),
      isActive: true
    }
    const dependencyManager = new DependencyInstaller(mocklanguageServerApi as any, flowVersionProvider)
    await assert.doesNotReject(async () => { await dependencyManager.installMissing() })

    // Check that all dependencies are installed
    await dependencyManager.checkDependencies()
    assert.deepStrictEqual(await dependencyManager.missingDependencies.getValue(), [])
  }).timeout(MaxTimeout)

  test('Flow CLI installer restarts langauge server if active', async () => {
    const mocklanguageServerApi = {
      activate: stub().callsFake(async () => {
        mocklanguageServerApi.isActive = true
      }),
      deactivate: stub().callsFake(async () => {
        mocklanguageServerApi.isActive = false
      }),
      isActive: true
    }
    const mockInstallerContext = {
      refreshDependencies: async () => {},
      languageServerApi: mocklanguageServerApi as any,
      flowVersionProvider
    }
    const flowCliInstaller = new InstallFlowCLI(mockInstallerContext)

    await assert.doesNotReject(async () => { await flowCliInstaller.install() })
    assert(mocklanguageServerApi.deactivate.calledOnce)
    assert(mocklanguageServerApi.activate.calledOnce)
    assert(mocklanguageServerApi.deactivate.calledBefore(mocklanguageServerApi.activate))
  }).timeout(MaxTimeout)

  test('Flow CLI installer does not restart langauge server if inactive', async () => {
    const mocklanguageServerApi = {
      activate: stub().callsFake(async () => {
        mocklanguageServerApi.isActive = true
      }),
      deactivate: stub().callsFake(async () => {
        mocklanguageServerApi.isActive = false
      }),
      isActive: false
    }
    const mockInstallerContext = {
      refreshDependencies: async () => {},
      languageServerApi: mocklanguageServerApi as any,
      flowVersionProvider
    }
    const flowCliInstaller = new InstallFlowCLI(mockInstallerContext)

    await assert.doesNotReject(async () => { await flowCliInstaller.install() })
    assert(mocklanguageServerApi.activate.notCalled)
    assert(mocklanguageServerApi.deactivate.notCalled)
  }).timeout(MaxTimeout)
})
