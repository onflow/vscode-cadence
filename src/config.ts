import * as fs from "fs"
import * as cp from "child_process"

import { commands, window, workspace } from "vscode";
import { addAddressPrefix } from "./address";
import { makeFlag } from "./utils";
import { rejects } from "assert";

const CONFIG_FLOW_COMMAND = "flowCommand";
const CONFIG_SERVICE_PRIVATE_KEY = "servicePrivateKey";
const CONFIG_SERVICE_KEY_SIGNATURE_ALGORITHM = "serviceKeySignatureAlgorithm";
const CONFIG_SERVICE_KEY_HASH_ALGORITHM = "serviceKeyHashAlgorithm";
const CONFIG_EMULATOR_ADDRESS = "emulatorAddress";
const CONFIG_NUM_ACCOUNTS = "numAccounts";

const NAMES = [
  "Alice", "Bob", "Charlie", 
  "Dave", "Eve", "Faythe", 
  "Grace", "Heidi", "Ivan", 
  "Judy", "Michael", "Niaj", 
  "Olivia", "Oscar", "Peggy", 
  "Rupert", "Sybil", "Ted",
  "Victor", "Walter"
].map(name => name.toLowerCase())

// An account that can be used to submit transactions.
export class Account {
  index: number;
  address: string;
  name: string;

  constructor(index: number, address: string, name?: string) {
    this.index = index;
    this.address = address;
    // TODO: fix name selection here
    this.name = NAMES[index]
  }

  getAddress(withPrefix: boolean = true): string {
    return withPrefix ? `0x${this.address}` : this.address
  }

  getName(): string {
    const name = this.name || `Account ${this.index + 1}`
    return `${name[0].toUpperCase()}${name.slice(1)}`
  }

  fullName(): string {
    return `${this.getName()} (${addAddressPrefix(this.address)})`;
  }
}

// The subset of extension configuration used by the language server.
type ServerConfig = {
  servicePrivateKey: string;
  serviceKeySignatureAlgorithm: string;
  serviceKeyHashAlgorithm: string;
  emulatorAddress: string;
};

// The configuration used by the extension.
export class Config {
  // The name of the Flow CLI executable.
  flowCommand: string;
  serverConfig: ServerConfig;
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
    serverConfig: ServerConfig
  ) {
    this.flowCommand = flowCommand;
    this.numAccounts = numAccounts;
    this.serverConfig = serverConfig;
    this.accounts = [];
    this.activeAccount = null;

    this.configPath = "";
  }

  async createAccount(key: string){
    console.log(`Init account for ${key}`)
    // TODO: This shall be removed and handled by emulator...
    const publicKeys: any = {
      "alice": "0ec9d54500e37b1d55219daac65907e48ab34a0535886fc38f1784f1260a9fe65e641fd0ead0f7d269d38f53460f219f22478d49cdf1b497114a843e885e0132",
      "bob": "0cd80a797c165c1bc313f7fd95ad4b84b8ffae4546d5b1b12c5d9b34dff5320bd928e079fe66e52efe97398ccd95162cc4eb118153aad8c92659e94387b4a735"
    }
    
    const publicKey = publicKeys[key] || ""
    const publicKeyFlag = makeFlag('key')(publicKey)

    const command = [
      this.flowCommand,
      'accounts',
      'create',
      publicKeyFlag
    ].join(" ")

    return new Promise((resolve, reject) => {
      cp.exec(command, (e, stdout) => {
        if (e) {
          reject("Error creating account")
          window.showErrorMessage(e.message);
        } else {
          console.log(`Account for ${key} created`)
          resolve(null)
        }
      });
    });

  }

  async readLocalConfig(){
    const file = await workspace.findFiles('flow.json')
    if (file.length === 1) {
        const configFile = file[0]
        const content = await fs.promises.readFile(configFile.path, { encoding: "utf-8" })
        const config = await JSON.parse(content.toString())

        console.log({ config })
        console.log(configFile.path)

        for (const key in config.accounts){
          if (key !== "service"){
            const account = config.accounts[key]
            this.addAccount(account.address, key)
            await this.createAccount(key)
          }
        }
        
        this.configPath = configFile.path;
    } else {
        // TODO: show message that file is not present and propose to init it
    }
  }

  addAccount(address: string, name: string) {
    const index = this.accounts.length;
    this.accounts.push(new Account(index, address, name));
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

  accountExists(name: string){
    return this.accounts.filter(acc => {
      console.log({acc})  
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

  const servicePrivateKey: string | undefined = cadenceConfig.get(
    CONFIG_SERVICE_PRIVATE_KEY
  );
  if (!servicePrivateKey) {
    throw new Error(`Missing ${CONFIG_SERVICE_PRIVATE_KEY} config`);
  }

  const serviceKeySignatureAlgorithm: string | undefined = cadenceConfig.get(
    CONFIG_SERVICE_KEY_SIGNATURE_ALGORITHM
  );
  if (!serviceKeySignatureAlgorithm) {
    throw new Error(`Missing ${CONFIG_SERVICE_KEY_SIGNATURE_ALGORITHM} config`);
  }

  const serviceKeyHashAlgorithm: string | undefined = cadenceConfig.get(
    CONFIG_SERVICE_KEY_HASH_ALGORITHM
  );
  if (!serviceKeyHashAlgorithm) {
    throw new Error(`Missing ${CONFIG_SERVICE_KEY_HASH_ALGORITHM} config`);
  }

  const emulatorAddress: string | undefined = cadenceConfig.get(
    CONFIG_EMULATOR_ADDRESS
  );
  if (!emulatorAddress) {
    throw new Error(`Missing ${CONFIG_EMULATOR_ADDRESS} config`);
  }

  const numAccounts: number | undefined = cadenceConfig.get(
    CONFIG_NUM_ACCOUNTS
  );
  if (!numAccounts) {
    throw new Error(`Missing ${CONFIG_NUM_ACCOUNTS} config`);
  }

  const serverConfig: ServerConfig = {
    servicePrivateKey,
    serviceKeySignatureAlgorithm,
    serviceKeyHashAlgorithm,
    emulatorAddress,
  };

  return new Config(flowCommand, numAccounts, serverConfig);
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
 