import * as assert from 'assert'
import * as depInstaller from '../../src/dependency-installer/dependency-installer'
import { MaxTimeout } from '../globals'

// Note: Dependency installation must run before other integration tests
suite('Dependency Installer', () => {
  test('Install Missing Dependencies', async () => {
    const dependencyManager = new depInstaller.DependencyInstaller()
    await assert.doesNotReject(async () => { await dependencyManager.installMissing() })
  }).timeout(MaxTimeout)
})
