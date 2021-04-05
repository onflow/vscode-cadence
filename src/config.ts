import { commands, window, workspace } from "vscode";
import { Account } from './account'

const CONFIG_FLOW_COMMAND = "flowCommand";
const CONFIG_NUM_ACCOUNTS = "numAccounts";

// The configuration used by the extension.
export class Config {
  // The name of the Flow CLI executable.
  flowCommand: string;
  numAccounts: number;
  // Set of created accounts for which we can submit transactions.
  // Mapping from account address to account object.
  accounts: Array<Account>;
  // Index of the currently active account.
  activeAccount: number | null;


  // Full path to flow.json file
  configPath: string;

  constructor(
    flowCommand: string,
    numAccounts: number,
  ) {
    this.flowCommand = flowCommand;
    this.numAccounts = numAccounts;
    this.accounts = [];
    this.activeAccount = null;
    this.configPath = "";
  }

  async readLocalConfig() {
    const file = await workspace.findFiles('flow.json')
    if (file.length === 1) {
      const configFile = file[0]
      this.configPath = configFile.path;
    } else {
      // TODO: show message that file is not present and propose to init it
    }
  }
  
  addAccount(account: Account) {
    const index = this.accounts.length;
    account.setIndex(index)
    this.accounts.push(account)
    
    if (index === 0) {
      this.setActiveAccount(0)
    }
  }

  setActiveAccount(index: number) {
    this.activeAccount = index;
  }

  getActiveAccount(): Account | null {
    if (this.activeAccount == null) {
      return null;
    }

    return this.accounts[this.activeAccount];
  }

  getAccount(index: number): Account | null {
    if (index < 0 || index >= this.accounts.length) {
      return null;
    }

    return this.accounts[index];
  }

  accountExists(name: string) {
    return this.accounts.filter(acc => {
      return acc.name === name
    }).length > 0
  }

  // Resets account state
  resetAccounts() {
    this.accounts = [];
    this.activeAccount = null;
  }
}

// Retrieves config from the workspace.
export function getConfig(): Config {

  const cadenceConfig = workspace.getConfiguration("cadence");

  const flowCommand: string | undefined = cadenceConfig.get(
    CONFIG_FLOW_COMMAND
  );
  if (!flowCommand) {
    throw new Error(`Missing ${CONFIG_FLOW_COMMAND} config`);
  }

  const numAccounts: number | undefined = cadenceConfig.get(
    CONFIG_NUM_ACCOUNTS
  );
  if (!numAccounts) {
    throw new Error(`Missing ${CONFIG_NUM_ACCOUNTS} config`);
  }

  return new Config(flowCommand, numAccounts);
}

// Adds an event handler that prompts the user to reload whenever the config
// changes.
export function handleConfigChanges() {
  workspace.onDidChangeConfiguration((e) => {
    // TODO: do something smarter for account/emulator config (re-send to server)
    const promptRestartKeys = [
      "languageServerPath",
      "accountKey",
      "accountAddress",
      "emulatorAddress",
    ];
    const shouldPromptRestart = promptRestartKeys.some((key) =>
      e.affectsConfiguration(`cadence.${key}`)
    );
    if (shouldPromptRestart) {
      window
        .showInformationMessage(
          "Server launch configuration change detected. Reload the window for changes to take effect",
          "Reload Window",
          "Not now"
        )
        .then((choice) => {
          if (choice === "Reload Window") {
            commands.executeCommand("workbench.action.reloadWindow");
          }
        });
    }
  });
}
