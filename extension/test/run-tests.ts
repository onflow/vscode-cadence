/* Run integration tests */
import * as path from 'path'
import * as os from 'os'
import { runTests } from '@vscode/test-electron'
import { execPowerShell } from '../src/utils/exec-system'

const GET_PATH_POWER_SHELL = 'echo ([System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"));'

async function main (): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../src/')
    const extensionTestsPath = path.resolve(__dirname, './index.js')
    const testWorkspace = path.resolve(__dirname, './integration/fixtures/workspace')

    if (os.platform() === 'win32') {
      // Install dependencies (will trigger a reload)
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [testWorkspace, '--disable-telemetry'],
        extensionTestsEnv: { INSTALL_DEPENDENCIES_ONLY: 'true' }
      })

      // Get new environment variables
      const PATH = (await execPowerShell(GET_PATH_POWER_SHELL)).stdout.replace(/\r?\n|\r/g, '')

      // Run the rest of the tests
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [testWorkspace, '--disable-telemetry'],
        extensionTestsEnv: { PATH, DEPENDENCIES_INSTALLED: 'true' }
      })
    } else {
      // Download VS Code, unzip it and run the integration test
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [testWorkspace, '--disable-telemetry'],
      })
    }
  } catch (err) {
    console.error('Failed to run tests')
    process.exit(1)
  }
}

main().then(() => {}, () => {})
