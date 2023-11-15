
import { Subject, firstValueFrom, of } from 'rxjs'
import { FlowConfig } from '../../src/server/flow-config'
import { Settings } from '../../src/settings/settings'
import { before, afterEach } from 'mocha'
import * as assert from 'assert'
import * as path from 'path'
import * as fs from 'fs'

const workspacePath = path.resolve(__dirname, './fixtures/workspace')

suite('flow config tests', () => {
  let rootConfigPath: string
  let rootConfig: Buffer

  function deleteRootConfig (): void {
    fs.unlinkSync(rootConfigPath)
  }

  function restoreRootConfig (): void {
    fs.writeFileSync(rootConfigPath, rootConfig)
  }

  async function withConfig (mockSettings: Settings, cb: (config: FlowConfig) => void | Promise<void>): Promise<void> {
    const config = new FlowConfig(mockSettings)
    await config.activate()
    try {
      await cb(config)
    } finally {
      config?.dispose()
    }
  }

  before(() => {
    // cache config at root if deleted later
    rootConfigPath = path.resolve(workspacePath, 'flow.json')
    rootConfig = fs.readFileSync(rootConfigPath)
  })

  afterEach(() => {
    // restore config at root
    restoreRootConfig()
  })

  test('recognizes custom config path', async () => {
    const mockSettings: Settings = {
      customConfigPath: './foo/flow.json',
      didChange$: of()
    } as any

    await withConfig(mockSettings, (config) => {
      assert.strictEqual(config.configPath, path.resolve(workspacePath, './foo/flow.json'))
    })
  })

  test('recognizes config path from project root', async () => {
    const mockSettings: Settings = {
      customConfigPath: '',
      didChange$: of()
    } as any

    await withConfig(mockSettings, (config) => {
      assert.strictEqual(config.configPath, path.resolve(workspacePath, './flow.json'))
    })
  })

  test('recognizes custom config change & emits pathChanged$', async () => {
    const didChange$ = new Subject<void>()
    const mockSettings = {
      customConfigPath: './foo/flow.json',
      didChange$: didChange$.asObservable()
    } as any

    await withConfig(mockSettings, async (config) => {
      assert.strictEqual(config.configPath, path.resolve(workspacePath, './foo/flow.json'))

      const pathChangedPromise = firstValueFrom(config.pathChanged$)

      // update custom config path
      mockSettings.customConfigPath = './bar/flow.json'
      didChange$.next()

      await pathChangedPromise
      assert.strictEqual(config.configPath, path.resolve(workspacePath, './bar/flow.json'))
    })
  })

  test('ignores non-existent custom config path', async () => {
    const mockSettings = {
      customConfigPath: './missing/flow.json',
      didChange$: of()
    } as any

    await withConfig(mockSettings, (config) => {
      assert.strictEqual(config.configPath, null)
    })
  })

  test('null if no config at root or custom path', async () => {
    // temporarily delete config at root
    deleteRootConfig()

    const mockSettings: Settings = {
      customConfigPath: '',
      didChange$: of()
    } as any

    await withConfig(mockSettings, (config) => {
      assert.strictEqual(config.configPath, null)
    })
  })

  test('detects config creation at root', async () => {
    // temporarily delete config at root
    deleteRootConfig()

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000)
    })

    const mockSettings = {
      customConfigPath: '',
      didChange$: of()
    } as any

    await withConfig(mockSettings, async (config) => {
      assert.strictEqual(config.configPath, null)

      // restore config at root
      restoreRootConfig()

      await firstValueFrom(config.pathChanged$)
      assert.strictEqual(config.configPath, rootConfigPath)
    })
  }).timeout(5000)

  test('detects creation of previously non-existent custom config', async () => {
    // ensure file does not exist
    if (fs.existsSync(path.resolve(workspacePath, './missing/flow.json'))) {
      fs.unlinkSync(path.resolve(workspacePath, './missing/flow.json'))
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000)
    })

    const mockSettings = {
      customConfigPath: './missing/flow.json',
      didChange$: of()
    } as any

    await withConfig(mockSettings, async (config) => {
      assert.strictEqual(config.configPath, null)

      // create custom config must create if non-existent
      fs.mkdirSync(path.resolve(workspacePath, './missing'), { recursive: true })
      fs.writeFileSync(path.resolve(workspacePath, './missing/flow.json'), '{}')

      await firstValueFrom(config.pathChanged$)
      assert.strictEqual(config.configPath, path.resolve(workspacePath, './missing/flow.json'))
    })

    // delete custom config after test
    fs.unlinkSync(path.resolve(workspacePath, './missing/flow.json'))
  })
})
