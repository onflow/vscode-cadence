import * as assert from 'assert'
import {DependencyInstaller} from '../../src/dependency-installer/dependency-installer'
import { MaxTimeout } from '../globals'
import * as os from 'os'

// Note: Dependency installation must run before other integration tests
suite('Dependency Installer', () => {
  test('Install Missing Dependencies', async () => {
    const dependencyManager = new DependencyInstaller()
    console.log(await dependencyManager.missingDependencies.getValue())
    await assert.doesNotReject(async () => { await dependencyManager.installMissing() })

    // Check that all dependencies are installed
    await dependencyManager.checkDependencies()
    assert.deepStrictEqual(await dependencyManager.missingDependencies.getValue(), [])
  }).timeout(MaxTimeout)
})
