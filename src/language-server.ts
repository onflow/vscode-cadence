import {LanguageClient} from "vscode-languageclient";
import {ExtensionContext, window, commands} from "vscode";
import {Config} from "./config";
import { 
    CREATE_ACCOUNT_SERVER, 
    CREATE_DEFAULT_ACCOUNTS_SERVER, 
    SWITCH_ACCOUNT_SERVER, 
    DEPLOY_CONTRACT,
    EXECUTE_SCRIPT,
    SEND_TRANSACTION,
    CHANGE_EMULATOR_STATE
} from "./commands";
import { EmulatorState } from './extension'

// The args to pass to the Flow CLI to start the language server.
const START_LANGUAGE_SERVER_ARGS = ["cadence", "language-server"];


export class LanguageServerAPI {
    client: LanguageClient;

    constructor(ctx: ExtensionContext, config: Config, emulatorState: EmulatorState) {
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
                
                this.client.onNotification(DEPLOY_CONTRACT, this.deployContract);
                this.client.onNotification(EXECUTE_SCRIPT, this.executeScript);
                this.client.onNotification(SEND_TRANSACTION, this.sendTransaction);

                return window.showInformationMessage("Cadence language server started");
            })
            .catch(err => {
                return window.showErrorMessage(
                    `Cadence language server failed to start: ${err}`
                );
            });

        const clientDisposable = this.client.start();
        ctx.subscriptions.push(clientDisposable);
    }


    // Executes command to deploy contract with provided arguments
    async deployContract(...params: any){
        console.log({params})
        return commands.executeCommand(
            DEPLOY_CONTRACT,
            params
        )
    }

    // Sends a request to execute script with provided arguments
    async executeScript(args: string){
        console.log({args})
        return commands.executeCommand(
            EXECUTE_SCRIPT,
            args
        )
    }

    // Executes command to send transaction with provided arguments
    async sendTransaction(args: any, signers: any){        
        return commands.executeCommand(
            SEND_TRANSACTION,
            args,
            signers
        )
    }

    async changeEmulatorState(emulatorState: EmulatorState) {
        console.log({ emulatorState })
        return this.client.sendRequest("workspace/executeCommand", {
            command: CHANGE_EMULATOR_STATE,
            arguments:[
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
