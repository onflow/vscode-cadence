/* Run integration tests */
import * as path from 'path'
import { runTests } from '@vscode/test-electron'

async function main (): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../src/')
    const extensionTestsPath = path.resolve(__dirname, './integration/index.js')

    const testWorkspace = path.resolve(__dirname, './integration/fixtures/workspace')

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [testWorkspace]
    })
  } catch (err) {
    console.error('Failed to run tests')
    process.exit(1)
  }
}

main().then(() => {}, () => {})
