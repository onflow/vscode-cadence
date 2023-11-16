import * as assert from 'assert'
import { DependencyInstaller } from '../../src/dependency-installer/dependency-installer'
import { MaxTimeout } from '../globals'
import { InstallFlowCLI } from '../../src/dependency-installer/installers/flow-cli-installer'
import { stub } from 'sinon'

// Note: Dependency installation must run before other integration tests
suite('Dependency Installer', () => {
  test('Install Missing Dependencies', async () => {
    const mockLangaugeServerApi = {
      activate: stub(),
      deactivate: stub(),
      isActive: true
    }
    const dependencyManager = new DependencyInstaller(mockLangaugeServerApi as any)
    await assert.doesNotReject(async () => { await dependencyManager.installMissing() })

    // Check that all dependencies are installed
    await dependencyManager.checkDependencies()
    assert.deepStrictEqual(await dependencyManager.missingDependencies.getValue(), [])
  }).timeout(MaxTimeout)

  test('Flow CLI installer restarts langauge server if active', async () => {
    const mockLangaugeServerApi = {
      activate: stub().callsFake(async () => {
        mockLangaugeServerApi.isActive = true
      }),
      deactivate: stub().callsFake(async () => {
        mockLangaugeServerApi.isActive = false
      }),
      isActive: true
    }
    const mockInstallerContext = {
      refreshDependencies: async () => {},
      langaugeServerApi: mockLangaugeServerApi as any
    }
    const flowCliInstaller = new InstallFlowCLI(mockInstallerContext)

    await assert.doesNotReject(async () => { await flowCliInstaller.install() })
    assert(mockLangaugeServerApi.deactivate.calledOnce)
    assert(mockLangaugeServerApi.activate.calledOnce)
    assert(mockLangaugeServerApi.deactivate.calledBefore(mockLangaugeServerApi.activate))
  }).timeout(MaxTimeout)

  test('Flow CLI installer does not restart langauge server if inactive', async () => {
    const mockLangaugeServerApi = {
      activate: stub().callsFake(async () => {
        mockLangaugeServerApi.isActive = true
      }),
      deactivate: stub().callsFake(async () => {
        mockLangaugeServerApi.isActive = false
      }),
      isActive: false
    }
    const mockInstallerContext = {
      refreshDependencies: async () => {},
      langaugeServerApi: mockLangaugeServerApi as any
    }
    const flowCliInstaller = new InstallFlowCLI(mockInstallerContext)

    await assert.doesNotReject(async () => { await flowCliInstaller.install() })
    assert(mockLangaugeServerApi.activate.notCalled)
    assert(mockLangaugeServerApi.deactivate.notCalled)
  }).timeout(MaxTimeout)
})
