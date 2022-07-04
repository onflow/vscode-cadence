import * as path from 'path'

import { runTests } from '@vscode/test-electron'

async function main (): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../')
    const extensionTestsPath = path.resolve(__dirname, './suite/index')

    const testWorkspace = path.resolve(process.cwd(), './src/test/fixtures/workspace')

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
