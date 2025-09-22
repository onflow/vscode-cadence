import * as vscode from 'vscode'
import { CADENCE_TEST_TAG } from './constants'
import { execDefault } from '../utils/shell/exec'
import { workspace } from 'vscode'
import * as path from 'path'
import { Settings } from '../settings/settings'
import { QueuedMutator, TestTrie } from './test-trie'
import { TestResolver } from './test-resolver'
import { decodeTestFunctionId } from './utils'
import { semaphore } from '../utils/semaphore'

const TEST_RESULT_PASS = 'PASS'

interface TestResult {
  [filename: string]: {
    [testName: string]: string
  }
}

export class TestRunner implements vscode.Disposable {
  #controller: vscode.TestController
  #testTrie: QueuedMutator<TestTrie>
  #settings: Settings
  #testResolver: TestResolver
  #acquireLock: <T>(fn: () => Promise<T>) => Promise<T>
  #disposibles: vscode.Disposable[] = []

  constructor (controller: vscode.TestController, testTrie: QueuedMutator<TestTrie>, settings: Settings, testResolver: TestResolver) {
    this.#controller = controller
    this.#testTrie = testTrie
    this.#settings = settings
    this.#testResolver = testResolver
    this.#acquireLock = semaphore(settings.getSettings().test.maxConcurrency)

    this.#disposibles.push(this.#controller.createRunProfile('Cadence Tests', vscode.TestRunProfileKind.Run, this.runTests.bind(this), true, CADENCE_TEST_TAG))
  }

  dispose (): void {
    this.#disposibles.forEach((disposable) => disposable.dispose())
  }

  async runTests (request: vscode.TestRunRequest, cancellationToken?: vscode.CancellationToken, hookTestRun: (testRun: vscode.TestRun) => vscode.TestRun = run => run): Promise<void> {
    // Flush the test trie to make sure that all tests are up to date
    await this.#testTrie.getState()

    // Allow the test run creation to be hooked into for testing purposes
    const run = hookTestRun(this.#controller.createTestRun(request))

    await Promise.all(request.include?.map(async (test) => {
      await this.runTestItem(test, run, cancellationToken)
    }) ?? [])

    run.end()
  }

  private async runTestItem (test: vscode.TestItem, run: vscode.TestRun, cancellationToken?: vscode.CancellationToken): Promise<void> {
    if (cancellationToken?.isCancellationRequested === true) {
      return
    }

    const testFunctionName = decodeTestFunctionId(test.id)

    if (testFunctionName != null) {
      await this.runIndividualTest(test, run, cancellationToken)
    } else {
      if (test.uri == null) {
        throw new Error('Test uri is null')
      }
      const fsStat = await vscode.workspace.fs.stat(test.uri)
      if (fsStat.type === vscode.FileType.Directory) {
        await this.runTestFolder(test, run, cancellationToken)
      } else {
        await this.runTestFile(test, run, cancellationToken)
      }
    }
  }

  async runTestFolder (test: vscode.TestItem, run: vscode.TestRun, cancellationToken?: vscode.CancellationToken): Promise<void> {
    const promises: Array<Promise<void>> = []
    test.children.forEach((child) => {
      promises.push(this.runTestItem(child, run, cancellationToken))
    })
    await Promise.all(promises)
  }

  async runTestFile (test: vscode.TestItem, run: vscode.TestRun, cancellationToken?: vscode.CancellationToken): Promise<void> {
    // Notify that all tests contained within the uri have started
    test.children.forEach((testItem) => {
      run.started(testItem)
    })

    // If files are dirty they must be saved before running tests
    // The trie is updated with the new test items after the file is saved
    let resolvedTest: vscode.TestItem | null = test
    const openDocument = vscode.workspace.textDocuments.find((document) => test.uri != null && document.uri.fsPath === test.uri.fsPath)
    if (openDocument?.isDirty === true) {
      await openDocument.save()
      await this.#testTrie.mutate(async (trie) => {
        if (test.uri == null) {
          throw new Error('Test uri is null')
        }
        await this.#testResolver.addTestsFromFile(test.uri.fsPath, trie)
      })

      if (test.uri == null) {
        throw new Error('Test uri is null')
      }
      const trie = await this.#testTrie.getState()
      resolvedTest = trie.get(test.uri.fsPath)

      if (resolvedTest == null) {
        throw new Error(`Failed to find test item for ${test.uri.fsPath} in test trie`)
      }

      // Make sure that new test items are notified as started
      resolvedTest.children.forEach((testItem) => {
        run.started(testItem)
      })
    }

    // Execute the tests
    if (resolvedTest.uri == null) {
      throw new Error('Test uri is null')
    }
    const testFilePath = resolvedTest.uri.fsPath
    let testResults: TestResult = {}
    try {
      testResults = await this.#executeTests(testFilePath, cancellationToken)
    } catch (error: any) {
      resolvedTest.children.forEach((testItem) => {
        run.errored(testItem, error)
      })
      return
    }

    // Notify the results of all tests contained within the uri
    resolvedTest.children.forEach((testItem) => {
      const testId = decodeTestFunctionId(testItem.id)
      let result: string
      if (testId == null || testResults[testFilePath]?.[testId] == null) {
        result = 'ERROR - Test not found'
      } else {
        result = testResults[testFilePath][testId]
      }

      if (result === TEST_RESULT_PASS) {
        run.passed(testItem)
      } else {
        run.failed(testItem, {
          message: result
        })
      }
    })
  }

  async runIndividualTest (test: vscode.TestItem, run: vscode.TestRun, cancellationToken?: vscode.CancellationToken): Promise<void> {
    // Run parent test item to run the individual test
    // In the future we may want to run the individual test directly
    if (test.parent != null) {
      await this.runTestItem(test.parent, run, cancellationToken)
    }
  }

  async #executeTests (globPattern: string, cancellationToken?: vscode.CancellationToken): Promise<TestResult> {
    if (cancellationToken?.isCancellationRequested === true) {
      return {}
    }

    return await this.#acquireLock(async () => {
      const args = ['test', `'${globPattern}'`, '--output=json']
      const nearestConfigDir = await this.#findNearestFlowConfigDir(globPattern)
      const cwd = nearestConfigDir ?? workspace.workspaceFolders?.[0]?.uri.fsPath
      const { stdout, stderr } = await execDefault(this.#settings.getSettings().flowCommand, args, cwd != null ? { cwd } : undefined, cancellationToken)

      if (stderr.length > 0) {
        throw new Error(stderr)
      }

      const testResults = JSON.parse(stdout) as TestResult
      return testResults
    })
  }

  async #findNearestFlowConfigDir (startFilePath: string): Promise<string | undefined> {
    try {
      let currentDir = path.dirname(startFilePath)

      // Walk up the directory tree until filesystem root
      // Return the first directory that contains a flow.json
      while (true) {
        const candidate = path.join(currentDir, 'flow.json')
        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(candidate))
          return currentDir
        } catch {}

        const parentDir = path.dirname(currentDir)
        if (parentDir === currentDir) { break }
        currentDir = parentDir
      }
    } catch {}

    return undefined
  }
}
