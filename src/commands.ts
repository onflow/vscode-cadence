import {
  commands,
  ExtensionContext,
  Position,
  Range,
  window,
  env
} from 'vscode'
import { Extension, renderExtension, EmulatorState } from './extension'
import { LanguageServerAPI } from './language-server'
import { createTerminal } from './terminal'
import {
  COPY_ADDRESS,
  CREATE_NEW_ACCOUNT,
  ACTIVE_PREFIX,
  INACTIVE_PREFIX,
  ADD_NEW_PREFIX
} from './strings'
import * as Telemetry from './telemetry'
import { captureException } from './sentry-wrapper'

// Command identifiers for locally handled commands
export const RESTART_SERVER = 'cadence.restartServer'
export const START_EMULATOR = 'cadence.runEmulator'
export const STOP_EMULATOR = 'cadence.stopEmulator'
export const CREATE_ACCOUNT = 'cadence.createAccount'
export const SWITCH_ACCOUNT = 'cadence.switchActiveAccount'

// Command identifiers for commands running in CLI
export const DEPLOY_CONTRACT = 'cadence.deployContract'
export const EXECUTE_SCRIPT = 'cadence.executeScript'
export const SEND_TRANSACTION = 'cadence.sendTransaction'

// Command identifies for commands handled by the Language server
export const CREATE_ACCOUNT_SERVER = 'cadence.server.flow.createAccount'
export const CREATE_DEFAULT_ACCOUNTS_SERVER =
  'cadence.server.flow.createDefaultAccounts'
export const SWITCH_ACCOUNT_SERVER = 'cadence.server.flow.switchActiveAccount'
export const CHANGE_EMULATOR_STATE = 'cadence.server.flow.changeEmulatorState'
export const INIT_ACCOUNT_MANAGER = 'cadence.server.flow.initAccountManager'

// Registers a command with VS Code so it can be invoked by the user.
function registerCommand (
  ctx: ExtensionContext,
  command: string,
  callback: (...args: any[]) => any
): void {
  const commandCallback = (): void => { Telemetry.withTelemetry(callback) }
  ctx.subscriptions.push(commands.registerCommand(command, commandCallback))
}

// Registers all commands that are handled by the extension (as opposed to
// those handled by the Language Server).
export function registerCommands (ext: Extension): void {
  registerCommand(ext.ctx, RESTART_SERVER, restartServer(ext))
  registerCommand(ext.ctx, START_EMULATOR, startEmulator(ext))
  registerCommand(ext.ctx, STOP_EMULATOR, stopEmulator(ext))
  registerCommand(ext.ctx, CREATE_ACCOUNT, createAccount(ext))
  registerCommand(ext.ctx, SWITCH_ACCOUNT, switchActiveAccount(ext))
}

// Restarts the language server, updating the client in the extension object.
const restartServer = (ext: Extension) => async (): Promise<Extension> => {
  await ext.api.client.stop()
  const activeAccount = ext.config.getActiveAccount()
  ext.api = new LanguageServerAPI(ext.ctx, ext.config, ext.emulatorState, activeAccount)

  return ext
}

// Starts the emulator in a terminal window.
const startEmulator = (ext: Extension) => async (): Promise<EmulatorState> => {
  // Start the emulator with the service key we gave to the language server.
  const { configPath } = ext.config

  ext.setEmulatorState(EmulatorState.Starting)

  renderExtension(ext)

  ext.terminal.sendText(
    [
      ext.config.flowCommand,
      'emulator',
      `--config-path="${configPath}"`,
      '--verbose'
    ].join(' ')
  )
  ext.terminal.show()

  try {
    await ext.api.initAccountManager()

    const accounts = await ext.api.createDefaultAccounts(ext.config.numAccounts)
    for (const account of accounts) {
      ext.config.addAccount(account)
    }

    await setActiveAccount(ext, 0)

    ext.setEmulatorState(EmulatorState.Started)
    renderExtension(ext)
  } catch (err) {
    captureException(err)
    ext.setEmulatorState(EmulatorState.Stopped)
    renderExtension(ext)
  }

  return ext.getEmulatorState()
}

// Stops emulator, exits the terminal, and removes all config/db files.
const stopEmulator = (ext: Extension) => async (): Promise<EmulatorState> => {
  ext.terminal.dispose()
  ext.terminal = createTerminal(ext.ctx)

  ext.setEmulatorState(EmulatorState.Stopped)

  // Clear accounts and restart language server to ensure account state is in sync.
  ext.config.resetAccounts()
  renderExtension(ext)
  await ext.api.client.stop()
  ext.api = new LanguageServerAPI(ext.ctx, ext.config, ext.emulatorState, null)

  return ext.getEmulatorState()
}

// Creates a new account by requesting that the Language Server submit
// a "create account" transaction from the currently active account.
const createAccount = (ext: Extension) => async () => {
  return await createNewAccount(ext)
}

// Switches the active account to the option selected by the user. The selection
// is propagated to the Language Server.
const switchActiveAccount = (ext: Extension) => async () => {
  // Create the options (mark the active account with an 'active' prefix)
  const accountOptions = Object.values(ext.config.accounts)
    // Mark the active account with a `*` in the dialog
    .map((account) => {
      const prefix: string =
        account.index === ext.config.activeAccount ? ACTIVE_PREFIX : INACTIVE_PREFIX
      const label = `${prefix} ${account.fullName()}`

      return {
        label: label,
        target: account.index
      }
    })

  accountOptions.push({
    label: `${ADD_NEW_PREFIX} ${CREATE_NEW_ACCOUNT}`,
    target: accountOptions.length
  })

  window.showQuickPick(accountOptions).then(async (selected) => {
    // `selected` is undefined if the QuickPick is dismissed, and the
    // string value of the selected option otherwise.
    if (selected === undefined) {
      return
    }

    if (selected.target === accountOptions.length - 1) {
      await createNewAccount(ext)
      return
    }

    await setActiveAccount(ext, selected.target)
    renderExtension(ext)
  }, () => {})
}

const createNewAccount = async (ext: Extension): Promise<void> => {
  try {
    const account = await ext.api.createAccount()
    ext.config.addAccount(account)
    const lastIndex = ext.config.accounts.length - 1

    await setActiveAccount(ext, lastIndex)
    renderExtension(ext)
  } catch (err) { // ref: is error handling necessary here?
    captureException(err)
    window.showErrorMessage(`Failed to create account: ${err.message as string}`)
      .then(() => {}, () => {})
  }
}

const setActiveAccount = async (ext: Extension, activeIndex: number): Promise<void> => {
  const activeAccount = ext.config.getAccount(activeIndex)

  if (activeAccount == null) {
    captureException(new Error('Failed to switch account: account does not exist'))
    window.showErrorMessage('Failed to switch account: account does not exist.')
      .then(() => {}, () => {})
    return
  }

  try {
    await ext.api.switchActiveAccount(activeAccount)
    ext.config.setActiveAccount(activeIndex)

    window.showInformationMessage(
      `Switched to account ${activeAccount.fullName()}`,
      COPY_ADDRESS
    ).then((choice) => {
      if (choice === COPY_ADDRESS) {
        env.clipboard.writeText(`0x${activeAccount.address}`)
          .then(() => {}, () => {})
      }
    }, () => {})

    renderExtension(ext)
  } catch (err) {
    captureException(err)
    window.showErrorMessage(`Failed to switch account: ${err.message as string}`)
      .then(() => {}, () => {})
  }
}

// This method will add and then remove a space on the last line to trick codelens to be updated
export const refreshCodeLenses = (): void => {
  window.visibleTextEditors.forEach((editor) => {
    if (editor.document.lineCount !== 0) {
      return
    }
    // NOTE: We add a space to the end of the last line to force
    // Codelens to refresh.
    const lineCount = editor.document.lineCount
    const lastLine = editor.document.lineAt(lineCount - 1)
    editor.edit((edit) => {
      if (lastLine.isEmptyOrWhitespace) {
        edit.insert(new Position(lineCount - 1, 0), ' ')
        edit.delete(new Range(lineCount - 1, 0, lineCount - 1, 1000))
      } else {
        edit.insert(new Position(lineCount - 1, 1000), '\n')
      }
    }).then(() => {}, () => {})
  })
}
