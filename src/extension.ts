import {
  ExtensionContext,
  window,
  Terminal,
  StatusBarItem,
  workspace
} from 'vscode'
import { getConfig, handleConfigChanges, Config } from './config'
import { LanguageServerAPI } from './language-server'
import { refreshCodeLenses, registerCommands } from './commands'
import { createTerminal } from './terminal'
import {
  createEmulatorStatusBarItem,
  updateEmulatorStatusBarItem,
  createActiveAccountStatusBarItem,
  updateActiveAccountStatusBarItem
} from './status-bar'
import * as util from 'util'
import * as cp from 'child_process'
const exec = util.promisify(cp.exec)

export enum EmulatorState {
  Stopped = 0,
  Starting,
  Started,
}

// The container for all data relevant to the extension.
export class Extension {
  config: Config
  ctx: ExtensionContext
  api: LanguageServerAPI
  terminal: Terminal
  emulatorState: EmulatorState = EmulatorState.Stopped
  emulatorStatusBarItem: StatusBarItem
  activeAccountStatusBarItem: StatusBarItem

  constructor (
    config: Config,
    ctx: ExtensionContext,
    api: LanguageServerAPI,
    terminal: Terminal,
    emulatorStatusBarItem: StatusBarItem,
    activeAccountStatusBarItem: StatusBarItem
  ) {
    this.config = config
    this.ctx = ctx
    this.api = api
    this.terminal = terminal
    this.emulatorStatusBarItem = emulatorStatusBarItem
    this.activeAccountStatusBarItem = activeAccountStatusBarItem
  }

  getEmulatorState (): EmulatorState {
    return this.emulatorState
  }

  setEmulatorState (state: EmulatorState): void {
    this.emulatorState = state
    this.api.changeEmulatorState(state)
      .then(() => {}, () => {})
    refreshCodeLenses()
  }
}

let api: LanguageServerAPI

// Called when the extension starts up. Reads config, starts the language
// server, and registers command handlers.
export async function activate (ctx: ExtensionContext): Promise<void> {
  let config: Config
  let terminal: Terminal

  try {
    config = getConfig()
    if (config.enableCustomConfigPath) {
      if (!await config.readCustomConfig()) {
        throw Error('Could not read custom config file from path: ' + config.customConfigPath)
      }
    } else {
      if (!await config.readLocalConfig()) {
        if (!await promptInitializeConfig()) { return }
        await config.readLocalConfig()
      }
    }

    terminal = createTerminal(ctx)
    api = new LanguageServerAPI(ctx, config, EmulatorState.Stopped, null)
  } catch (err) {
    window.showErrorMessage(`Failed to activate extension: ${String(err)}`)
      .then(() => {}, () => {})
    return
  }
  handleConfigChanges()

  const ext = new Extension(
    config,
    ctx,
    api,
    terminal,
    createEmulatorStatusBarItem(),
    createActiveAccountStatusBarItem()
  )

  registerCommands(ext)
  renderExtension(ext)
}

async function promptInitializeConfig (): Promise<boolean> {
  let rootPath: string | undefined
  if ((workspace.workspaceFolders != null) && (workspace.workspaceFolders.length > 0)) {
    rootPath = workspace.workspaceFolders[0].uri.fsPath
  } else {
    rootPath = workspace.rootPath // ref: deprecated
  }
  if (rootPath === undefined) {
    return false
  }

  const continueMessage = 'Continue'
  const selection = await window.showInformationMessage('Missing Flow CLI configuration. Create a new one?', continueMessage)
  if (selection !== continueMessage) {
    return false
  }

  await exec('flow init', { cwd: rootPath })

  return true
}

export function deactivate (): Thenable<void> | undefined {
  if (typeof api === 'undefined') {
    return undefined
  }
  return api.client.stop()
}

export function renderExtension (ext: Extension): void {
  updateEmulatorStatusBarItem(ext.emulatorStatusBarItem, ext.getEmulatorState())
  updateActiveAccountStatusBarItem(ext.activeAccountStatusBarItem, ext.config.getActiveAccount())
}
