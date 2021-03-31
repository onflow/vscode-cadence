import * as cp from 'child_process';
import { decode } from "@onflow/decode"

import {
  commands,
  ExtensionContext,
  Position,
  Range,
  window,
  ProgressLocation,
  env,
  Uri
} from "vscode";

import { Extension, renderExtension, EmulatorState } from "./extension";
import { LanguageServerAPI } from "./language-server";
import { createTerminal } from "./terminal";
import { Account } from "./config";
import { makeArgsFlag, makeFlag } from "./utils";


// Command identifiers for locally handled commands
export const RESTART_SERVER = "cadence.restartServer";
export const START_EMULATOR = "cadence.runEmulator";
export const STOP_EMULATOR = "cadence.stopEmulator";
export const CREATE_ACCOUNT = "cadence.createAccount";
export const SWITCH_ACCOUNT = "cadence.switchActiveAccount";

// Command identifiers for commands running in CLI
export const DEPLOY_CONTRACT = "cadence.deployContract"
export const EXECUTE_SCRIPT = "cadence.executeScript"
export const SEND_TRANSACTION = "cadence.sendTransaction"

// Command identifies for commands handled by the Language server
export const CREATE_ACCOUNT_SERVER = "cadence.server.flow.createAccount";
export const CREATE_DEFAULT_ACCOUNTS_SERVER =
  "cadence.server.flow.createDefaultAccounts";
export const SWITCH_ACCOUNT_SERVER = "cadence.server.flow.switchActiveAccount";
export const CHANGE_EMULATOR_STATE = "cadence.server.flow.changeEmulatorState"
export const INIT_ACCOUNT_MANAGER = "cadence.server.flow.initAccountManager"

// Registers a command with VS Code so it can be invoked by the user.
function registerCommand(
  ctx: ExtensionContext,
  command: string,
  callback: (...args: any[]) => any
) {
  ctx.subscriptions.push(commands.registerCommand(command, callback));
}

// Registers all commands that are handled by the extension (as opposed to
// those handled by the Language Server).
export function registerCommands(ext: Extension) {
  registerCommand(ext.ctx, RESTART_SERVER, restartServer(ext));
  registerCommand(ext.ctx, START_EMULATOR, startEmulator(ext));
  registerCommand(ext.ctx, STOP_EMULATOR, stopEmulator(ext));
  registerCommand(ext.ctx, CREATE_ACCOUNT, createAccount(ext));
  registerCommand(ext.ctx, SWITCH_ACCOUNT, switchActiveAccount(ext));
}

// Restarts the language server, updating the client in the extension object.
const restartServer = (ext: Extension) => async () => {
  await ext.api.client.stop();
  const activeIndex = ext.config.activeAccount
  const {name, address} = activeIndex ? ext.config.accounts[activeIndex] : {name: "", address: ""}
  ext.api = new LanguageServerAPI(ext.ctx, ext.config, ext.emulatorState, {name, address});
};

// Starts the emulator in a terminal window.
const startEmulator = (ext: Extension) => async () => {
  // Start the emulator with the service key we gave to the language server.
  const { configPath } = ext.config;

  const configFlag = makeFlag('config-path')(configPath)

  ext.setEmulatorState(EmulatorState.Starting);

  renderExtension(ext);

  ext.terminal.sendText(
    [
      ext.config.flowCommand,
      `project`,
      `start-emulator`,
      configFlag,
      `--verbose`,
    ].join(" ")
  );
  ext.terminal.show();

  setTimeout(async () => {
    try {
      const deployResult = await ext.api.initAccountManager()
      ext.setEmulatorState(EmulatorState.Started);
      const accounts = await ext.api.createDefaultAccounts(ext.config.numAccounts);
      for (const account of accounts) {
        ext.config.addAccount(account)
      }

      await ext.api.switchActiveAccount(accounts[0])
      
      renderExtension(ext);
    } catch (err) {

      ext.setEmulatorState(EmulatorState.Stopped);
      renderExtension(ext);

    }
  }, 7000);
  
};

// Stops emulator, exits the terminal, and removes all config/db files.
const stopEmulator = (ext: Extension) => async () => {
  ext.terminal.dispose();
  ext.terminal = createTerminal(ext.ctx);

  ext.setEmulatorState(EmulatorState.Stopped);
  ext.config.setActiveAccount(-1)

  // Clear accounts and restart language server to ensure account state is in sync.
  ext.config.resetAccounts();
  renderExtension(ext);
  await ext.api.client.stop();
  ext.api = new LanguageServerAPI(ext.ctx, ext.config, ext.emulatorState, {name: "", address: ""});
};

// Creates a new account by requesting that the Language Server submit
// a "create account" transaction from the currently active account.
const createAccount = (ext: Extension) => async () => {
  try {
    const account: any = await ext.api.createAccount();
    ext.config.addAccount(account)
    renderExtension(ext);
  } catch (err) {
    window.showErrorMessage("Failed to create account: " + err);
    return;
  }
};

// Switches the active account to the option selected by the user. The selection
// is propagated to the Language Server.
const switchActiveAccount = (ext: Extension) => async () => {
  // Suffix to indicate which account is active
  const activePrefix = "🟢";
  const passivePrefix = "⚫️"
  // Create the options (mark the active account with an 'active' prefix)
  const accountOptions = Object.values(ext.config.accounts)
    // Mark the active account with a `*` in the dialog
    .map((account) => {
      const prefix: String =
        account.index === ext.config.activeAccount ? activePrefix : passivePrefix;
      const label = `${prefix} ${account.fullName()}`;

      return {
        label: label,
        target: account.index,
      };
    });

  window.showQuickPick(accountOptions).then(async (selected) => {
    // `selected` is undefined if the QuickPick is dismissed, and the
    // string value of the selected option otherwise.
    if (selected === undefined) {
      return;
    }

    const activeIndex = selected.target;
    const activeAccount = ext.config.getAccount(activeIndex);

    if (!activeAccount) {
      console.error("Switched to invalid account");
      return;
    }

    ext.config.setActiveAccount(activeIndex);
    await ext.api.switchActiveAccount(activeAccount)

    window.showInformationMessage(
      `Switched to account ${activeAccount.fullName()}`,
      "Copy Address"
    ).then((choice) => {
      if (choice === "Copy Address") {
        env.clipboard.writeText(`0x${activeAccount.address}`)
      }
    });

    renderExtension(ext);
  });
};

const setActiveAccount = (ext: Extension, activeAccount: Account) => {
  ext.config.setActiveAccount(activeAccount.index);
}

// This method will add and then remove a space on the last line to trick codelens to be updated
export const refreshCodeLenses = () => {
  window.visibleTextEditors.forEach((editor) => {
    if (!editor.document.lineCount) {
      return;
    }
    // NOTE: We add a space to the end of the last line to force
    // Codelens to refresh.
    const lineCount = editor.document.lineCount;
    const lastLine = editor.document.lineAt(lineCount - 1);
    editor.edit((edit) => {
      if (lastLine.isEmptyOrWhitespace) {
        edit.insert(new Position(lineCount - 1, 0), " ");
        edit.delete(new Range(lineCount - 1, 0, lineCount - 1, 1000));
      } else {
        edit.insert(new Position(lineCount - 1, 1000), "\n");
      }
    });
  });
}