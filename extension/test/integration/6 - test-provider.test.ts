import { beforeEach, afterEach } from 'mocha'
import { TestProvider } from '../../src/test-provider/test-provider'
import { Settings } from '../../src/settings/settings'
import { FlowConfig } from '../../src/server/flow-config'
import { of } from 'rxjs'
import * as path from 'path'
import * as vscode from 'vscode'
import * as sinon from 'sinon'
import * as assert from 'assert'
import * as fs from 'fs'
import { getMockSettings } from '../mock/mockSettings'
import { MaxTimeout } from '../globals'

const workspacePath = path.resolve(__dirname, './fixtures/workspace')
const startsWithNormalized = (s: string, prefix: string): boolean => s.replace(/\r\n/g, '\n').startsWith(prefix)
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B\[[0-9;]*m/g
const normalizeOutput = (s: string): string => s.replace(/\r\n/g, '\n').replace(ANSI_REGEX, '')
const pathEndsWith = (absolutePath: string, relativeTail: string): boolean => {
  const normAbs = absolutePath.replace(/\\/g, '/')
  const normTail = relativeTail.replace(/\\/g, '/')
  return normAbs.endsWith(normTail)
}

suite('test provider tests', () => {
  let mockSettings: Settings
  let mockConfig: FlowConfig
  let testProvider: TestProvider
  let cleanupFunctions: Array<() => void | Promise<void>> = []

  beforeEach(async function () {
    this.timeout(MaxTimeout)

    const parserLocation = path.resolve(__dirname, '../../../../node_modules/@onflow/cadence-parser/dist/cadence-parser.wasm')

    mockSettings = getMockSettings({
      flowCommand: 'flow',
      test: {
        maxConcurrency: 1
      }
    })
    mockConfig = {
      fileModified$: of(),
      pathChanged$: of(),
      configPath: path.join(workspacePath, 'flow.json')
    } as any

    testProvider = new TestProvider(parserLocation, mockSettings, mockConfig)

    // Wait for test provider to initialize (allow extra time for Windows test discovery)
    await new Promise((resolve) => setTimeout(resolve, 12000))
  })

  afterEach(async function () {
    this.timeout(MaxTimeout)

    testProvider.dispose()
    for (const cleanupFunction of cleanupFunctions) {
      await cleanupFunction()
    }
    cleanupFunctions = []
  })

  test('runs all tests in workspace and reports results', async function () {
    let runSpy: sinon.SinonSpiedInstance<vscode.TestRun> | undefined

    await new Promise<void>(resolve => {
      void testProvider.runAllTests(undefined, (testRun) => {
        const originalEnd = testRun.end
        testRun.end = () => {
          originalEnd.call(testRun)
          resolve()
        }

        runSpy = sinon.spy(testRun)
        return runSpy
      })
    })

    if (runSpy == null) throw new Error('runSpy is null')

    const passedTests = runSpy.passed.getCalls().map(call => ({ filepath: (call.args[0].uri as vscode.Uri).fsPath, id: call.args[0].id }))
    const failedTests = runSpy.failed.getCalls().map(call => ({ filepath: (call.args[0].uri as vscode.Uri).fsPath, id: call.args[0].id, message: (call.args[1] as any).message }))

    passedTests.sort((a, b) => a.filepath.localeCompare(b.filepath))
    failedTests.sort((a, b) => a.filepath.localeCompare(b.filepath))

    assert.strictEqual(passedTests.length + failedTests.length, 5)
    assert.deepStrictEqual(passedTests, [
      { filepath: path.join(workspacePath, 'test/bar/test2.cdc'), id: ':testPassing' },
      { filepath: path.join(workspacePath, 'test/bar/test3.cdc'), id: ':testPassing' },
      { filepath: path.join(workspacePath, 'test/test1.cdc'), id: ':testPassing' }
    ])
    assert.deepStrictEqual(
      failedTests.map(t => ({ filepath: t.filepath, id: t.id })),
      [
        { filepath: path.join(workspacePath, 'test/bar/test2.cdc'), id: ':testFailing' },
        { filepath: path.join(workspacePath, 'test/bar/test3.cdc'), id: ':testFailing' }
      ]
    )
    assert.ok(startsWithNormalized(failedTests[0].message, 'FAIL: Execution failed:\nerror: assertion failed\n --> 7465737400000000000000000000000000000000000000000000000000000000:8:2\n'))
    assert.ok(startsWithNormalized(failedTests[1].message, 'FAIL: Execution failed:\nerror: assertion failed\n --> 7465737400000000000000000000000000000000000000000000000000000000:4:2\n'))
  }).timeout(60000)

  test('runs individual test and reports results', async function () {
    let runSpy: sinon.SinonSpiedInstance<vscode.TestRun> | undefined

    await new Promise<void>(resolve => {
      void testProvider.runIndividualTest(path.join(workspacePath, 'test/test1.cdc'), undefined, (testRun) => {
        const originalEnd = testRun.end
        testRun.end = () => {
          originalEnd.call(testRun)
          resolve()
        }

        runSpy = sinon.spy(testRun)
        return runSpy
      })
    })

    if (runSpy == null) throw new Error('runSpy is null')

    const passedTests = runSpy.passed.getCalls().map(call => ({ filepath: (call.args[0].uri as vscode.Uri).fsPath, id: call.args[0].id }))
    const failedTests = runSpy.failed.getCalls().map(call => ({ filepath: (call.args[0].uri as vscode.Uri).fsPath, id: call.args[0].id, message: (call.args[1] as any).message }))

    passedTests.sort((a, b) => a.filepath.localeCompare(b.filepath))
    failedTests.sort((a, b) => a.filepath.localeCompare(b.filepath))

    assert.strictEqual(passedTests.length + failedTests.length, 1)
    assert.deepStrictEqual(passedTests, [
      { filepath: path.join(workspacePath, 'test/test1.cdc'), id: ':testPassing' }
    ])
    assert.deepStrictEqual(failedTests, [])
  }).timeout(60000)

  test('runs tests including newly created file', async function () {
    // Create new file
    const testFilePath = path.join(workspacePath, 'test/bar/test4.cdc')
    const testFileContents = `
      import Test
      access(all) fun testPassing() {
        Test.assert(true)
      }
    `
    fs.writeFileSync(testFilePath, testFileContents)
    cleanupFunctions.push(async () => {
      fs.rmSync(testFilePath)
    })
    await new Promise<void>(resolve => setTimeout(resolve, 3000))

    // Run tests
    let runSpy: sinon.SinonSpiedInstance<vscode.TestRun> | undefined
    await new Promise<void>(resolve => {
      void testProvider.runAllTests(undefined, (testRun) => {
        const originalEnd = testRun.end
        testRun.end = () => {
          originalEnd.call(testRun)
          resolve()
        }

        runSpy = sinon.spy(testRun)
        return runSpy
      })
    })
    if (runSpy == null) throw new Error('runSpy is null')

    const passedTests = runSpy.passed.getCalls().map(call => ({ filepath: (call.args[0].uri as vscode.Uri).fsPath, id: call.args[0].id }))
    const failedTests = runSpy.failed.getCalls().map(call => ({ filepath: (call.args[0].uri as vscode.Uri).fsPath, id: call.args[0].id, message: (call.args[1] as any).message }))

    passedTests.sort((a, b) => a.filepath.localeCompare(b.filepath))
    failedTests.sort((a, b) => a.filepath.localeCompare(b.filepath))

    assert.strictEqual(passedTests.length + failedTests.length, 6)
    assert.deepStrictEqual(passedTests, [
      { filepath: path.join(workspacePath, 'test/bar/test2.cdc'), id: ':testPassing' },
      { filepath: path.join(workspacePath, 'test/bar/test3.cdc'), id: ':testPassing' },
      { filepath: path.join(workspacePath, 'test/bar/test4.cdc'), id: ':testPassing' },
      { filepath: path.join(workspacePath, 'test/test1.cdc'), id: ':testPassing' }
    ])
    assert.deepStrictEqual(
      failedTests.map(t => ({ filepath: t.filepath, id: t.id })),
      [
        { filepath: path.join(workspacePath, 'test/bar/test2.cdc'), id: ':testFailing' },
        { filepath: path.join(workspacePath, 'test/bar/test3.cdc'), id: ':testFailing' }
      ]
    )
    const msg2 = normalizeOutput(failedTests.find(t => pathEndsWith(t.filepath, 'test/bar/test2.cdc'))?.message ?? '')
    const msg3 = normalizeOutput(failedTests.find(t => pathEndsWith(t.filepath, 'test/bar/test3.cdc'))?.message ?? '')
    assert.ok(msg2.includes('assertion failed') && msg2.includes(':8:2'))
    assert.ok(msg3.includes('assertion failed') && msg3.includes(':4:2'))
  }).timeout(60000)

  test('runs tests including newly deleted file', async function () {
    // Delete test file
    const testFilePath = path.join(workspacePath, 'test/bar/test3.cdc')
    const originalContents = fs.readFileSync(testFilePath)
    fs.rmSync(testFilePath)

    cleanupFunctions.push(async () => {
      fs.writeFileSync(testFilePath, originalContents)
    })
    await new Promise<void>(resolve => setTimeout(resolve, 3000))

    // Run tests
    let runSpy: sinon.SinonSpiedInstance<vscode.TestRun> | undefined
    await new Promise<void>(resolve => {
      void testProvider.runAllTests(undefined, (testRun) => {
        const originalEnd = testRun.end
        testRun.end = () => {
          originalEnd.call(testRun)
          resolve()
        }

        runSpy = sinon.spy(testRun)
        return runSpy
      })
    })
    if (runSpy == null) throw new Error('runSpy is null')

    const passedTests = runSpy.passed.getCalls().map(call => ({ filepath: (call.args[0].uri as vscode.Uri).fsPath, id: call.args[0].id }))
    const failedTests = runSpy.failed.getCalls().map(call => ({ filepath: (call.args[0].uri as vscode.Uri).fsPath, id: call.args[0].id, message: (call.args[1] as any).message }))

    passedTests.sort((a, b) => a.filepath.localeCompare(b.filepath))
    failedTests.sort((a, b) => a.filepath.localeCompare(b.filepath))

    assert.strictEqual(passedTests.length + failedTests.length, 3)
    assert.deepStrictEqual(passedTests, [
      { filepath: path.join(workspacePath, 'test/bar/test2.cdc'), id: ':testPassing' },
      { filepath: path.join(workspacePath, 'test/test1.cdc'), id: ':testPassing' }
    ])
    assert.deepStrictEqual(failedTests.map(t => ({ filepath: t.filepath, id: t.id })), [
      { filepath: path.join(workspacePath, 'test/bar/test2.cdc'), id: ':testFailing' }
    ])
    assert.ok(startsWithNormalized(failedTests[0].message, 'FAIL: Execution failed:\nerror: assertion failed\n --> 7465737400000000000000000000000000000000000000000000000000000000:8:2\n'))
  }).timeout(60000)
})
