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

  registerCommand(ext.ctx, DEPLOY_CONTRACT, deployContract(ext))
  registerCommand(ext.ctx, EXECUTE_SCRIPT, executeScript(ext))
  registerCommand(ext.ctx, SEND_TRANSACTION, sendTransaction(ext))
}

// Show result of the script execution in form of an information message
const showScriptResult = async (response: string) => {
  const result = await decode(JSON.parse(response))
  const content = `Script Result: ${result}`;
  window.showInformationMessage(content)
}

// TODO: Error path
// - check if emulator is running
// - display error if tx/script failed

const deployContract = (ext: Extension) => async (uri: string, name: string, to: string) => {
  const filename = Uri.parse(uri).fsPath

  let txSigner = to
  if (txSigner.includes("active")) {
    txSigner = ext.config.getActiveAccount()?.name || "service"
  }

  // Check that account exist
  if (!ext.config.accountExists(txSigner)) {
    window.showErrorMessage(`Account "${txSigner}" does not exist`)
    return false;
  }


  const signerFlag = makeFlag("signer")(txSigner)
  const configFlag = makeFlag("config-path")(ext.config.configPath)

  const command =
    [
      ext.config.flowCommand,
      `accounts`,
      `add-contract`,
      name,
      filename,
      signerFlag,
      configFlag
    ].join(" ")

  window.withProgress({
    location: ProgressLocation.Notification,
    title: `Deploying ${name} contract. Please wait...`,
    cancellable: true,
    // TODO: add cancelation here
  }, (_, token) => {
    return new Promise((resolve, reject) => {
      // TODO: Show transaction state here, updating the status of it. 
      // We can utilize flow-js-sdk to subscribe to tx
      cp.exec(command, (e, stdout) => {
        if (e) {
          window.showErrorMessage(e.message);
          reject("Deployment failed")
        } else {
          resolve(null)
        }
      });
    });
  });

}

const executeScript = (ext: Extension) => async (uri: string, args: string[]) => {
  const filename = Uri.parse(uri).fsPath

  const argsFlag = makeArgsFlag(args)
  const codeFlag = makeFlag('code')(filename)

  const command =
    [
      ext.config.flowCommand,
      `scripts`,
      `execute`,
      codeFlag,
      argsFlag,
    ].join(" ")

  window.withProgress({
    location: ProgressLocation.Notification,
    title: "Executing script. Please wait...",
    cancellable: true
  }, (_, token) => {
    return new Promise((resolve) => {
      cp.exec(command, (e, stdout) => {
        if (e) {
          window.showErrorMessage(e.message);
        } else {
          showScriptResult(stdout)
          resolve(null)
        }
      });
    });
  });
}

const sendTransaction = (ext: Extension) => async (uri: string, args: string[], signers: string[]) => {
  const filename = Uri.parse(uri).fsPath

  const argsFlag = makeArgsFlag(args)
  const codeFlag = makeFlag('code')(filename)

  let txSigner = signers[0]
  if (txSigner.includes("active")) {
    txSigner = ext.config.getActiveAccount()?.name || "service"
  }

  // Check that account exist
  if (!ext.config.accountExists(txSigner)) {
    window.showErrorMessage(`Account "${txSigner}" does not exist`)
    return false;
  }

  const signerFlag = makeFlag("signer")(txSigner)
  const configFlag = makeFlag("config-path")(ext.config.configPath)

  const command =
    [
      ext.config.flowCommand,
      `transactions`,
      `send`,
      codeFlag,
      argsFlag,
      signerFlag,
      configFlag
    ].join(" ")

  window.withProgress({
    location: ProgressLocation.Notification,
    title: "Sending transaction. Please wait...",
    cancellable: true,
    // TODO: add cancelation here
  }, (_, token) => {
    return new Promise((resolve, reject) => {
      // TODO: Show transaction state here, updating the status of it. 
      // We can utilize flow-js-sdk to subscribe to tx
      cp.exec(command, (e, stdout) => {
        if (e) {
          window.showErrorMessage(e.message);
          reject("Transaction error happened")
        } else {
          resolve(null)
        }
      });
    });
  });
}


// Restarts the language server, updating the client in the extension object.
const restartServer = (ext: Extension) => async () => {
  await ext.api.client.stop();
  ext.api = new LanguageServerAPI(ext.ctx, ext.config, ext.emulatorState);
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
      `emulator`,
      `start`,
      `--verbose`,
      configFlag
    ].join(" ")
  );
  ext.terminal.show();


  // create default accounts after the emulator has started
  setTimeout(async () => {
    // Read local "flow.json" file
    await ext.config.readLocalConfig()

    try {
      const activeAccount = ext.config.getAccount(0)

      if (!activeAccount) {
        console.error("Failed to get initial active account");
        return;
      }

      ext.config.setActiveAccount(activeAccount.index);
      ext.setEmulatorState(EmulatorState.Started);
      renderExtension(ext);
    } catch (err) {

      ext.setEmulatorState(EmulatorState.Stopped);
      renderExtension(ext);

      window.showWarningMessage("Failed to get account list from file");
    }

  }, 3500);
};

// Stops emulator, exits the terminal, and removes all config/db files.
const stopEmulator = (ext: Extension) => async () => {
  ext.terminal.dispose();
  ext.terminal = createTerminal(ext.ctx);

  ext.setEmulatorState(EmulatorState.Stopped);

  // Clear accounts and restart language server to ensure account
  // state is in sync.
  ext.config.resetAccounts();
  renderExtension(ext);
  await ext.api.client.stop();
  ext.api = new LanguageServerAPI(ext.ctx, ext.config, ext.emulatorState);
};

// Creates a new account by requesting that the Language Server submit
// a "create account" transaction from the currently active account.
const createAccount = (ext: Extension) => async () => {
  try {
    const addr = await ext.api.createAccount();

    // edit flow.json file with CLI "accounts create"
    // manually update json

    ext.config.addAccount(addr, "");
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

  window.showQuickPick(accountOptions).then((selected) => {
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