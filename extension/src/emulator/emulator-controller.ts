/*
EmulatorController is used to execute commands on the emulation
Contains an account manager to manage active accounts
Communicates with local configs and language-server data
*/
import { ext } from "../main" 
import { TerminalController } from "./tools/terminal"
import { AccountManager } from "./tools/account-manager"
import { LanguageServerAPI } from "./server/language-server"
import { DEBUG_LOG } from "../utils/debug"
import { Config } from "./local/config"
import { Settings } from "../settings/settings"

export enum EmulatorState {
    Stopped = 0,
    Starting,
    Started,
}

export class EmulatorController {
    #accountManager: AccountManager
    #terminalCtrl: TerminalController
    api: LanguageServerAPI
    #state: EmulatorState

    constructor(storagePath: string | undefined, globalStoragePath: string) {
        // Initialize state
        this.#state = EmulatorState.Stopped
    
        // Initialize the language server api
        this.api = new LanguageServerAPI()
        DEBUG_LOG("Api Initialized")

        // Initialize AccountManager TODO: Needs to create local Account Data from settings
        this.#accountManager = new AccountManager(this.api)
        DEBUG_LOG("Account Manager Initialized")

        // Initialize a terminal
        this.#terminalCtrl = new TerminalController(storagePath, globalStoragePath)
        DEBUG_LOG("Terminal Initialized")
    }

    #setState(state: EmulatorState) {
        this.#state = state
        ext.emulatorStateChanged()
    }

    getState() {
        return this.#state
    }

    async startEmulator () {
        // Start the emulator with the service key we gave to the language server.
        this.#setState(EmulatorState.Starting)
        ext.emulatorStateChanged()
    
        // Start emulator in terminal window
        this.#terminalCtrl.startEmulator()
    
        try {
            await this.api.initAccountManager() // Note: seperate from AccountManager class

            const settings = Settings.getWorkspaceSettings()
        
            const accounts = await this.api.createDefaultAccounts(settings.numAccounts)

            // Add accounts to local data
            for (const account of accounts) {
                this.#accountManager.addAccountLocal(account)
            }
        
            await this.#accountManager.setActiveAccount(0)
        
            this.#setState(EmulatorState.Started)
            ext.emulatorStateChanged()
        } catch (err) {
            console.log("Failed to start emulator")
            this.#setState(EmulatorState.Stopped)
            ext.emulatorStateChanged()
        }
    }

    // Stops emulator, exits the terminal, and removes all config/db files.
    async stopEmulator () {
        this.#terminalCtrl.newTerminal()

        this.#setState(EmulatorState.Stopped)
    
        // Clear accounts and restart language server to ensure account state is in sync.
        this.#accountManager.resetAccounts()
        ext.emulatorStateChanged()
        await this.api.client.stop()

        // Initialize new language server
        this.api.reset()    // TODO: Implement this
    }

    /* Language Server Interface */
    restartServer() {
        this.api.restartServer()
    }

    /* Account Manager Interface */
    createNewAccount(){
        this.#accountManager.createNewAccount()
    }

    setActiveAccount(activeIndex: number){
        this.#accountManager.setActiveAccount(activeIndex)
    }

    switchActiveAccount() {
        this.#accountManager.switchActiveAccount()
    }

    getActiveAccount() {
        return this.#accountManager.getActiveAccount()
    }
}