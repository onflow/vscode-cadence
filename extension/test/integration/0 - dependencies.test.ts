import * as assert from 'assert'
import { DependencyInstaller } from '../../src/dependency-installer/dependency-installer'
import { MaxTimeout } from '../globals'
import { InstallFlowCLI } from '../../src/dependency-installer/installers/flow-cli-installer'
import { stub } from 'sinon'
import { before } from 'mocha'
import { CliProvider } from '../../src/flow-cli/cli-provider'
import { getMockSettings } from '../mock/mockSettings'

// Note: Dependency installation must run before other integration tests
suite('Dependency Installer', () => {
  let cliProvider: any

  before(async function () {
    cliProvider = new CliProvider(getMockSettings())
  })

  test('Install Missing Dependencies', async () => {
    const mockLanguageServerApi = {
      activate: stub(),
      deactivate: stub(),
      isActive: true
    }
    const dependencyManager = new DependencyInstaller(mockLanguageServerApi as any, cliProvider)
    await assert.doesNotReject(async () => { await dependencyManager.installMissing() })

    // Check that all dependencies are installed
    await dependencyManager.checkDependencies()
    assert.deepStrictEqual(await dependencyManager.missingDependencies.getValue(), [])
  }).timeout(MaxTimeout)

  test('Flow CLI installer restarts language server if active', async () => {
    const mockLanguageServerApi = {
      activate: stub().callsFake(async () => {
        mockLanguageServerApi.isActive = true
      }),
      deactivate: stub().callsFake(async () => {
        mockLanguageServerApi.isActive = false
      }),
      isActive: true
    }
    const mockInstallerContext = {
      refreshDependencies: async () => {},
      languageServerApi: mockLanguageServerApi as any,
      cliProvider
    }
    const flowCliInstaller = new InstallFlowCLI(mockInstallerContext)

    await assert.doesNotReject(async () => { await flowCliInstaller.install() })
    assert(mockLanguageServerApi.deactivate.calledOnce)
    assert(mockLanguageServerApi.activate.calledOnce)
    assert(mockLanguageServerApi.deactivate.calledBefore(mockLanguageServerApi.activate))
  }).timeout(MaxTimeout)

  test('Flow CLI installer does not restart language server if inactive', async () => {
    const mockLanguageServerApi = {
      activate: stub().callsFake(async () => {
        mockLanguageServerApi.isActive = true
      }),
      deactivate: stub().callsFake(async () => {
        mockLanguageServerApi.isActive = false
      }),
      isActive: false
    }
    const mockInstallerContext = {
      refreshDependencies: async () => {},
      languageServerApi: mockLanguageServerApi as any,
      cliProvider
    }
    const flowCliInstaller = new InstallFlowCLI(mockInstallerContext)

    await assert.doesNotReject(async () => { await flowCliInstaller.install() })
    assert(mockLanguageServerApi.activate.notCalled)
    assert(mockLanguageServerApi.deactivate.notCalled)
  }).timeout(MaxTimeout)
})
