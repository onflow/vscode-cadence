/* Handle flow.json config file */
import { window, workspace, Uri, FileSystemWatcher } from 'vscode'
import { Settings } from '../settings/settings'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { Disposable } from 'vscode-languageclient'
import { tryExecDefault } from '../utils/shell/exec'
import { BehaviorSubject, Observable, Subject, Subscription, distinctUntilChanged, map, throttleTime } from 'rxjs'
import { findFilesInAnyWorkspace, pathsAreEqual } from '../utils/utils'

export class FlowConfig implements Disposable {
  #configPath$: Observable<string | null>
  #configPathSubject$ = new BehaviorSubject<{
    path: string | null
    isCustom: boolean
  }>({
    path: null,
    isCustom: false
  })

  #fileModified$ = new Subject<void>()

  #workspaceSettingsSubscriber: Subscription | null = null
  #configChangeWatcher: Disposable | null = null

  #settings: Settings

  constructor (settings: Settings) {
    this.#settings = settings

    // Load initial config path
    void this.reloadConfigPath()

    // Create observable for config path, debounced and without metadata
    this.#configPath$ = this.#configPathSubject$.pipe(
      map(({ path }) => path),
      distinctUntilChanged(),
      throttleTime(500))

    // Watch for config changes
    this.#configChangeWatcher = this.#watchForConfigChanges()

    // Watch for workspace settings changes
    this.#workspaceSettingsSubscriber = this.#watchWorkspaceConfiguration()
  }

  get configPath (): string | null {
    return this.#configPathSubject$.value.path
  }

  get configPath$ (): Observable<string | null> {
    return this.#configPath$
  }

  get fileModified$ (): Subject<void> {
    return this.#fileModified$
  }

  dispose (): void {
    this.#workspaceSettingsSubscriber?.unsubscribe()
    this.#configChangeWatcher?.dispose()
    this.#configPathSubject$.complete()
  }

  async reloadConfigPath (): Promise<void> {
    let configPath: string | null = null
    let isCustomPath = false
    try {
      const { path, isCustom } = await this.#getConfigPath()
      if (path !== '' && path !== null) {
        configPath = path
        isCustomPath = isCustom
      }
    } catch (err) {}
    this.#configPathSubject$.next({ path: configPath, isCustom: isCustomPath })
  }

  async #getConfigPath (): Promise<{ path: string | null, isCustom: boolean }> {
    // First check if user has configured a custom path
    // It may throw an error if the path is invalid
    // If no custom path is configured, search for default config file
    const customPath = this.#resolveCustomConfigPath()
    if (customPath == null || customPath === '') {
      return { isCustom: false, path: await this.#resolveDefaultConfigPath() }
    }
    return { isCustom: false, path: customPath }
  }

  // Search for config file in workspace
  async #resolveDefaultConfigPath (): Promise<string | null> {
    // Default config search for flow.json in workspace
    const files = findFilesInAnyWorkspace('./flow.json')
    if (files.length === 0) {
      // Couldn't find config file, prompt user
      void this.promptInitializeConfig()
    } else if (files.length > 1) {
      void window.showErrorMessage(`Multiple flow.json files found: ${files.join(', ')}.  Please specify an absolute path to the desired flow.json file in your workspace settings.`)
    } else {
      return files[0]
    }

    return null
  }

  #resolveCustomConfigPath (): string | null {
    const customConfigPath = this.#settings.customConfigPath
    let resolvedPath: string | null = null

    const fileNotFoundMessage = `File specified at ${customConfigPath} not found.  Please verify the file exists.`

    if (customConfigPath === null || customConfigPath === '') {
      resolvedPath = null
    } else if (customConfigPath[0] === '~') {
      resolvedPath = path.join(
        os.homedir(),
        customConfigPath.slice(1)
      )
    } else if (path.isAbsolute(customConfigPath)) {
      resolvedPath = customConfigPath
    } else if (workspace.workspaceFolders != null) {
      // Find all files matching relative path in workspace
      const files = workspace.workspaceFolders.reduce<string[]>(
        (res, folder) => {
          const filePath = path.resolve(folder.uri.fsPath, customConfigPath)
          if (fs.existsSync(filePath)) {
            res.push(filePath)
          }
          return res
        },
        []
      )

      // Check that only one file was found (could be in multiple workspaces)
      if (files.length === 1) {
        resolvedPath = files[0]
      } else if (files.length === 0) {
        void window.showErrorMessage(fileNotFoundMessage)
        throw new Error('Custom file not found')
      } else {
        void window.showErrorMessage(`Multiple flow.json files found: ${files.join(', ')}.  Please specify an absolute path to the desired flow.json file in your workspace settings.`)
        throw new Error('Multiple flow.json files found')
      }
    }

    // Verify that the path exists if it was resolved
    if (resolvedPath != null && !fs.existsSync(resolvedPath)) {
      void window.showErrorMessage(fileNotFoundMessage)
      throw new Error('Custom file not found')
    }

    return resolvedPath
  }

  // Prompt the user to create a new config file
  async promptInitializeConfig (): Promise<void> {
    const rootPath = workspace.workspaceFolders?.[0]?.uri?.fsPath

    if (rootPath == null) {
      void window.showErrorMessage('No workspace folder found. Please open a workspace folder and try again.')
    }

    const continueMessage = 'Continue'
    const selection = await window.showInformationMessage(
      'Missing Flow CLI configuration. Create a new one?',
      continueMessage
    )
    if (selection !== continueMessage) {
      return
    }

    const didInit = await tryExecDefault('flow init', { cwd: rootPath })

    if (!didInit) {
      void window.showErrorMessage('Failed to initialize Flow CLI configuration.')
    } else {
      void window.showInformationMessage('Flow CLI configuration created.')
    }
  }

  // Watch and reload flow configuration when changed.
  #watchWorkspaceConfiguration (): Subscription {
    return this.#settings.didChange$.subscribe(() => {
      void this.reloadConfigPath()
    })
  }

  #watchForConfigChanges (): Disposable {
    let configWatcher: FileSystemWatcher

    // Recursively bind watcher every time config path changes
    const bindWatcher = (): void => {
      configWatcher?.dispose()

      // If custom config path is set, watch that file
      // Otherwise watch for flow.json in workspace
      const watchPath = this.#configPathSubject$.value.isCustom && this.#configPathSubject$.value.path != null ? this.#configPathSubject$.value.path : '**/flow.json'

      // Watch for changes to config file
      // If it does not exist, wait for flow.json to be created
      configWatcher = workspace.createFileSystemWatcher(watchPath)

      const configPathChangeHandler = (): void => {
        void this.reloadConfigPath()
      }
      const configModifyHandler = (file: Uri): void => {
        if (this.#configPathSubject$.value.path != null && pathsAreEqual(file.fsPath, this.#configPathSubject$.value.path)) {
          this.#fileModified$.next()
        }
      }

      configWatcher.onDidCreate(configPathChangeHandler)
      configWatcher.onDidDelete(configPathChangeHandler)
      configWatcher.onDidChange(configModifyHandler)
    }

    // Bind initial watcher
    bindWatcher()

    // If config path changes, dispose of current watcher and bind a new one to bind to new path
    const configSubscription = this.#configPath$.subscribe(() => {
      configWatcher.dispose()
      bindWatcher()
    })

    return {
      dispose: () => {
        configWatcher.dispose()
        configSubscription.unsubscribe()
      }
    }
  }
}
