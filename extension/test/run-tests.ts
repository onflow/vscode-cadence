/* Run integration tests */
import * as path from 'path'
import { runTests } from '@vscode/test-electron'
import { getEnvVars } from '../src/utils/shell/get-env-vars'
import { userInfo } from 'os'

async function main (): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../src/')
    const extensionTestsPath = path.resolve(__dirname, './index.js')
    const testWorkspace = path.resolve(__dirname, './integration/fixtures/workspace')

    if(process.platform === 'win32') {
      // Download VS Code, unzip it and run the integration test
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [testWorkspace, '--disable-telemetry'],
        extensionTestsEnv: {
          'INSTALL_ONLY': 'true'
        }
      })
    }

    // Refresh env vars (needed for windows)
    const env = await getEnvVars(detectDefaultShell())

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [testWorkspace, '--disable-telemetry'],
      extensionTestsEnv: env
    })
  } catch (err) {
    console.error('Failed to run tests')
    process.exit(1)
  }
}

const detectDefaultShell = () => {
	const {env} = process;

	if (process.platform === 'win32') {
		return env.COMSPEC || 'cmd.exe';
	}

	try {
		const {shell} = userInfo();
		if (shell) {
			return shell;
		}
	} catch {}

	if (process.platform === 'darwin') {
		return env.SHELL || '/bin/zsh';
	}

	return env.SHELL || '/bin/sh';
}

main().then(() => {}, () => {})
