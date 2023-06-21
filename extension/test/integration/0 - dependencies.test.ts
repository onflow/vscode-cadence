import * as assert from 'assert'
import {DependencyInstaller} from '../../src/dependency-installer/dependency-installer'
import { MaxTimeout } from '../globals'
import * as os from 'os'

// Note: Dependency installation must run before other integration tests
suite('Dependency Installer', () => {
  test('Install Missing Dependencies', async () => {
    const dependencyManager = new DependencyInstaller()
    await assert.doesNotReject(dependencyManager.installMissing)

    // Check that all dependencies are installed
    await dependencyManager.checkDependencies()
    assert.deepStrictEqual(await dependencyManager.checkDependencies(), [])
  }).timeout(MaxTimeout)
})
