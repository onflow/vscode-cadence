/* Handle flow.json config file */
import { window, workspace, Uri, FileSystemWatcher } from 'vscode'
import { Settings } from '../settings/settings'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { Disposable } from 'vscode-languageclient'
import { tryExecDefault } from '../utils/shell/exec'
import { BehaviorSubject, Observable, Subject, Subscription, connectable, distinctUntilChanged, map, Connectable } from 'rxjs'
import { findFilesInAnyWorkspace, pathsAreEqual } from '../utils/utils'

export interface FlowConfigFile {
  path: string | null
  isCustom: boolean
  exists: boolean
}

export class FlowConfig implements Disposable {
  #configPath$ = new BehaviorSubject<FlowConfigFile>({
    path: null,
    isCustom: false,
    exists: false
  })

  #fileModified$ = new Subject<void>()
  #pathChanged$: Connectable<void>

  #pathChangedConnection$: Subscription | null = null
  #workspaceSettingsSubscriber: Subscription | null = null
  #configChangeWatcher: Disposable | null = null
  #workspaceFolderWatcher: Disposable | null = null

  #settings: Settings

  constructor (settings: Settings) {
    this.#settings = settings

    this.#pathChanged$ = connectable(this.#configPath$.pipe(
      map(({ path, exists }) => (path != null && exists) ? path : null),
      distinctUntilChanged(),
      map(() => {})
    ))
    this.#pathChangedConnection$ = this.#pathChanged$.connect()
  }

  async activate (): Promise<void> {
    // Load initial config path
    await this.reloadConfigPath()

    // Watch for config changes
    this.#configChangeWatcher = this.#watchForConfigChanges()

    // Watch for workspace settings changes
    this.#workspaceSettingsSubscriber = this.#watchWorkspaceConfiguration()

    // Watch for workspace folder changes (may affect config path)
    this.#workspaceFolderWatcher = workspace.onDidChangeWorkspaceFolders(() => {
      void this.reloadConfigPath()
    })
  }

  get configPath (): string | null {
    const { path, exists } = this.#configPath$.value
    return path != null && exists ? path : null
  }

  get pathChanged$ (): Observable<void> {
    return this.#pathChanged$
  }

  get fileModified$ (): Observable<void> {
    return this.#fileModified$.asObservable()
  }

  dispose (): void {
    this.#pathChangedConnection$?.unsubscribe()
    this.#workspaceSettingsSubscriber?.unsubscribe()
    this.#configChangeWatcher?.dispose()
    this.#workspaceFolderWatcher?.dispose()
    this.#configPath$.complete()
  }

  async reloadConfigPath (): Promise<void> {
    const configPath = this.#resolveCustomConfigPath() ?? await this.#resolveDefaultConfigPath()
    this.#configPath$.next(configPath ?? { path: null, isCustom: false, exists: false })
  }

  // Search for config file in workspace
  async #resolveDefaultConfigPath (): Promise<FlowConfigFile | null> {
    // Default config search for flow.json in workspace
    const files = findFilesInAnyWorkspace('./flow.json')
    if (files.length === 0) {
      // Couldn't find config file, prompt user
      void this.promptInitializeConfig()
    } else if (files.length > 1) {
      void window.showErrorMessage(`Multiple flow.json files found: ${files.join(', ')}.  Please specify an absolute path to the desired flow.json file in your workspace settings.`)
    } else {
      return { path: files[0], isCustom: false, exists: true }
    }

    return null
  }

  #resolveCustomConfigPath (): FlowConfigFile | null {
    const customConfigPath = this.#settings.getSettings().customConfigPath
    if (customConfigPath === null || customConfigPath === '') {
      return null
    }

    let resolvedPath: string
    const fileNotFoundMessage = `File specified at ${customConfigPath} not found.  Please verify the file exists.`

    if (customConfigPath[0] === '~') {
      resolvedPath = path.join(
        os.homedir(),
        customConfigPath.slice(1)
      )
    } else if (path.isAbsolute(customConfigPath)) {
      resolvedPath = customConfigPath
    } else if (workspace.workspaceFolders != null) {
      // Find all files matching relative path in workspace
      const files = findFilesInAnyWorkspace(customConfigPath)

      // Check that only one file was found (could be in multiple workspaces)
      if (files.length === 1) {
        resolvedPath = files[0]
      } else if (files.length === 0) {
        void window.showErrorMessage(fileNotFoundMessage)
        return { path: customConfigPath, isCustom: true, exists: false }
      } else {
        void window.showErrorMessage(`Multiple flow.json files found: ${files.join(', ')}.  Please specify an absolute path to the desired flow.json file in your workspace settings.`)
        return { path: customConfigPath, isCustom: true, exists: false }
      }
    } else {
      return null
    }

    // Verify that the path exists if it was resolved
    if (!fs.existsSync(resolvedPath)) {
      void window.showErrorMessage(fileNotFoundMessage)
      return { path: customConfigPath, isCustom: true, exists: false }
    }

    return { path: resolvedPath, isCustom: true, exists: true }
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

    const didInit = await tryExecDefault('flow', ['init'], { cwd: rootPath })

    if (!didInit) {
      void window.showErrorMessage('Failed to initialize Flow CLI configuration.')
    } else {
      void window.showInformationMessage('Flow CLI configuration created.')
    }
  }

  // Watch and reload flow configuration when changed.
  #watchWorkspaceConfiguration (): Subscription {
    return this.#settings.watch$(config => config.customConfigPath).subscribe(() => {
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
      const relativeWatchPath = this.#configPath$.value.isCustom && this.#configPath$.value.path != null ? this.#configPath$.value.path : './flow.json'
      const watchPaths = new Set(workspace.workspaceFolders?.map(folder => path.resolve(folder.uri.fsPath, relativeWatchPath)) ?? [])

      watchPaths.forEach(watchPath => {
        // Watch for changes to config file
        // If it does not exist, wait for flow.json to be created
        configWatcher = workspace.createFileSystemWatcher(watchPath)

        const configPathChangeHandler = (): void => {
          void this.reloadConfigPath()
        }
        const configModifyHandler = (file: Uri): void => {
          if (this.configPath != null && pathsAreEqual(file.fsPath, this.configPath)) {
            this.#fileModified$.next()
          }
        }

        configWatcher.onDidCreate(configPathChangeHandler)
        configWatcher.onDidDelete(configPathChangeHandler)
        configWatcher.onDidChange(configModifyHandler)
      })
    }

    // Bind initial watcher
    bindWatcher()

    // If config path changes, dispose of current watcher and bind a new one to bind to new path
    const configSubscription = this.pathChanged$.subscribe(() => {
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
