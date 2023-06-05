/* Run integration tests */
import * as path from 'path'
import * as os from 'os'
import { runTests } from '@vscode/test-electron'

async function main (): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../src/')
    const extensionTestsPath = path.resolve(__dirname, './index.js')
    const testWorkspace = path.resolve(__dirname, './integration/fixtures/workspace')
    
    if(os.platform() === 'win32') {
      // Install dependencies (will trigger a reload)
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [testWorkspace, '--disable-telemetry'],
        extensionTestsEnv: { 'INSTALL_DEPENDENCIES_ONLY': 'true' },
      })

      // Run the rest of the tests
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [testWorkspace, '--disable-telemetry'],
        extensionTestsEnv: { 'SKIP_INSTALL_DEPENDENCIES': 'true' },
      })
    } else {
      // Download VS Code, unzip it and run the integration test
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [testWorkspace, '--disable-telemetry']
      })
    }


  } catch (err) {
    console.error('Failed to run tests')
    process.exit(1)
  }
}

main().then(() => {}, () => {})
