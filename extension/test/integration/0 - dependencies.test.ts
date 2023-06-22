import * as assert from 'assert'
import {DependencyInstaller} from '../../src/dependency-installer/dependency-installer'
import { MaxTimeout } from '../globals'
import { window } from 'vscode'

// Note: Dependency installation must run before other integration tests
suite('Dependency Installer', () => {
  test('Install Missing Dependencies', async () => {
    const dependencyManager = new DependencyInstaller()
    const timeouts = []
    timeouts.push(setTimeout(() => window.activeTerminal?.sendText(''), 1000))
    timeouts.push(setTimeout(() => window.activeTerminal?.sendText(''), 2000))
    timeouts.push(setTimeout(() => window.activeTerminal?.sendText(''), 3000))
    timeouts.push(setTimeout(() => window.activeTerminal?.sendText(''), 4000))
    timeouts.push(setTimeout(() => window.activeTerminal?.sendText(''), 5000))
    timeouts.push(setTimeout(() => window.activeTerminal?.sendText(''), 6000))
    timeouts.push(setTimeout(() => window.activeTerminal?.sendText(''), 7000))
    timeouts.push(setTimeout(() => window.activeTerminal?.sendText(''), 8000))
    timeouts.push(setTimeout(() => window.activeTerminal?.sendText(''), 9000))
    await assert.doesNotReject(async () => { await dependencyManager.installMissing() })

    timeouts.forEach(timeout => clearTimeout(timeout))

    // Check that all dependencies are installed
    await dependencyManager.checkDependencies()
    assert.deepStrictEqual(await dependencyManager.missingDependencies.getValue(), [])
  }).timeout(MaxTimeout)
})
