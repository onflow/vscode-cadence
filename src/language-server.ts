import { LanguageClient, StateChangeEvent } from "vscode-languageclient";
import { ExtensionContext, window, commands } from "vscode";
import { Config } from "./config";
import {
    CREATE_ACCOUNT_SERVER,
    CREATE_DEFAULT_ACCOUNTS_SERVER,
    SWITCH_ACCOUNT_SERVER,
    CHANGE_EMULATOR_STATE,
    INIT_ACCOUNT_MANAGER
} from "./commands";
import { EmulatorState } from './extension'

// The args to pass to the Flow CLI to start the language server.
const START_LANGUAGE_SERVER_ARGS = ["cadence", "language-server"];


export class LanguageServerAPI {
    client: LanguageClient;
    running: boolean

    constructor(ctx: ExtensionContext, config: Config, emulatorState: EmulatorState) {
        // Init running state with false and update, when client is connected to server
        this.running = false

        this.client = new LanguageClient(
            "cadence",
            "Cadence",
            {
                command: config.flowCommand,
                args: START_LANGUAGE_SERVER_ARGS,
            },
            {
                documentSelector: [{ scheme: "file", language: "cadence" }],
                synchronize: {
                    configurationSection: "cadence"
                },
                initializationOptions: {
                    ...config.serverConfig,
                    emulatorState
                }
            }
        );

        this.client
            .onReady()
            .then(() => {
                return window.showInformationMessage("Cadence language server started");
            })
            .catch(err => {
                return window.showErrorMessage(
                    `Cadence language server failed to start: ${err}`
                );
            });

        this.client.onDidChangeState((e: StateChangeEvent) => {
            switch(e.newState){
                case 1:
                    this.running = false
                    break;
                case 2:
                    this.running = true
                    break;
                default:
                    this.running = false
                    break
            }
        })

        const clientDisposable = this.client.start();
        ctx.subscriptions.push(clientDisposable);
    }

    async initAccountManager() {
        return this.client.sendRequest("workspace/executeCommand", {
            command: INIT_ACCOUNT_MANAGER,
            arguments: []
        })
    }

    async changeEmulatorState(emulatorState: EmulatorState) {
        return this.client.sendRequest("workspace/executeCommand", {
            command: CHANGE_EMULATOR_STATE,
            arguments: [
                emulatorState
            ]
        })
    }

    // Sends a request to switch the currently active account.
    async switchActiveAccount(accountAddr: string) {
        return this.client.sendRequest("workspace/executeCommand", {
            command: SWITCH_ACCOUNT_SERVER,
            arguments: [
                accountAddr,
            ],
        });
    }

    // Sends a request to create a new account. Returns the address of the new
    // account, if it was created successfully.
    async createAccount(): Promise<string> {
        let res = await this.client.sendRequest("workspace/executeCommand", {
            command: CREATE_ACCOUNT_SERVER,
            arguments: [],
        });
        return res as string;
    }

    // Sends a request to create a set of default accounts. Returns the addresses of the new
    // accounts, if they were created successfully.
    async createDefaultAccounts(count: number): Promise<Array<string>> {
        let res = await this.client.sendRequest("workspace/executeCommand", {
            command: CREATE_DEFAULT_ACCOUNTS_SERVER,
            arguments: [count],
        });
        return res as Array<string>;
    }
}
