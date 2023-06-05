import * as assert from 'assert'
import * as depInstaller from '../../src/dependency-installer/dependency-installer'
import { MaxTimeout } from '../globals'
import { restartVscode } from '../../src/utils/utils'
import { window } from 'vscode'
import * as os from 'os'

// Note: Dependency installation must run before other integration tests
suite('Dependency Installer', () => {
  if(process.env.SKIP_INSTALL_DEPENDENCIES === 'true') {
    test('Dependencies Installed', async () => {
      const dependencyManager = new depInstaller.DependencyInstaller()
      await dependencyManager.checkDependencies()
      assert.deepStrictEqual(await dependencyManager.missingDependencies.getValue(), [])
    })
  } else {
    test('Install Missing Dependencies', async () => {
      const dependencyManager = new depInstaller.DependencyInstaller()
      await assert.doesNotReject(async () => { await dependencyManager.installMissing() })

      // Check that all dependencies are installed
      await dependencyManager.checkDependencies()
      assert.deepStrictEqual(await dependencyManager.missingDependencies.getValue(), [])

      if(os.platform() === 'win32') {
        // Restart extension and check that all dependencies are still installed
        restartVscode()
      }
    }).timeout(MaxTimeout)
  }
})
