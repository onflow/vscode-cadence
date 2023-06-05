import * as assert from 'assert'
import * as depInstaller from '../../src/dependency-installer/dependency-installer'
import { MaxTimeout } from '../globals'
import { restartVscode } from '../../src/utils/utils'
import { window } from 'vscode'
import * as os from 'os'
import { getMockSettings } from '../mock/mockSettings'

// Note: Dependency installation must run before other integration tests
suite('Dependency Installer', () => {
  if(process.env.INSTALL_DEPENDENCIES === 'true') {
    test('Install Missing Dependencies', async () => {
      const dependencyManager = new depInstaller.DependencyInstaller()
      await assert.doesNotReject(async () => { await dependencyManager.installMissing() })

      if(os.platform() === 'win32') {
        // Restart extension and check that all dependencies are still installed
        restartVscode()
      } else {
        // Check that all dependencies are installed
        await dependencyManager.checkDependencies()
        assert.deepStrictEqual(await dependencyManager.missingDependencies.getValue(), [])
      }
    }).timeout(MaxTimeout)
  } else {
    test('Dependencies Installed', async () => {
      const dependencyManager = new depInstaller.DependencyInstaller()
      await dependencyManager.checkDependencies()
      assert.deepStrictEqual(await dependencyManager.missingDependencies.getValue(), [])
    })
  }
})
