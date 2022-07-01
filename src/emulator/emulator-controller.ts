/*
EmulatorController is used to execute commands on the emulation
Contains an account manager to manage active accounts
Communicates with local configs and language-server data
*/
import { ext } from "../extension" 
import { TerminalController } from "./tools/terminal"
import { AccountManager } from "./tools/account-manager"
import { LanguageServerAPI } from "./server/language-server"
import { Config } from "./local/config"
import { DEBUG_LOG } from "../utils/debug"

export enum EmulatorState {
    Stopped = 0,
    Starting,
    Started,
}

export class EmulatorController {
    accountManager: AccountManager
    terminalCtrl: TerminalController
    api: LanguageServerAPI
    config: Config
    #state: EmulatorState

    constructor(storagePath: string | undefined, globalStoragePath: string) {
        // Initialize state
        this.#state = EmulatorState.Stopped
    
        // Initialize local config
        this.config = new Config()
        DEBUG_LOG("Config Initialized")
        DEBUG_LOG("config path 1: " + this.config.configPath)


        // Initialize the language server api
        this.api = new LanguageServerAPI(this.config.configPath, this.config.accessCheckMode, 
            this.config.flowCommand, this.#state, null)
        DEBUG_LOG("Api Initialized")


        // Initialize AccountManager
        this.accountManager = new AccountManager(this.config, this.api)
        DEBUG_LOG("Account Manager Initialized")


        // Initialize a terminal
        DEBUG_LOG("config path: " + this.config.configPath)
        this.terminalCtrl = new TerminalController(this.config.flowCommand, this.config.configPath, 
            storagePath, globalStoragePath)
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
    
        // Start emulator in terminal window
        this.terminalCtrl.startEmulator()
    
        try {
            await this.api.initAccountManager() // Note: seperate from AccountManager class
        
            const accounts = await this.api.createDefaultAccounts(this.config.numAccounts)
            for (const account of accounts) {
                this.config.addAccount(account)
            }
        
            await this.accountManager.setActiveAccount(0)
        
            this.#setState(EmulatorState.Started)
        } catch (err) {
            console.log("Failed to start emulator")
            this.#setState(EmulatorState.Stopped)
        }
    }

    // Stops emulator, exits the terminal, and removes all config/db files.
    async stopEmulator () {
        this.terminalCtrl.newTerminal()

        this.#setState(EmulatorState.Stopped)
    
        // Clear accounts and restart language server to ensure account state is in sync.
        this.config.resetAccounts()
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
        this.accountManager.createNewAccount()
    }

    setActiveAccount(activeIndex: number){
        this.accountManager.setActiveAccount(activeIndex)
    }

    switchActiveAccount() {
        this.accountManager.switchActiveAccount()
    }

    getActiveAccount() {
        return this.accountManager.getActiveAccount()
    }
}