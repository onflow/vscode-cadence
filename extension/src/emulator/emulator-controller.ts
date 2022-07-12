/*
EmulatorController is used to execute commands on the Flow emulator
Contains an account manager to manage active accounts
Communicates with local configs and language-server data
*/
import { ext } from '../main'
import { TerminalController } from './tools/terminal'
import { AccountManager } from './tools/account-manager'
import { LanguageServerAPI } from './server/language-server'
import { Settings } from '../settings/settings'
import { Account } from './account'

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

  constructor (storagePath: string | undefined, globalStoragePath: string) {
    // Initialize state
    this.#state = EmulatorState.Stopped

    // Initialize the language server api
    this.api = new LanguageServerAPI()

    // Initialize AccountManager
    this.#accountManager = new AccountManager(this.api)

    // Initialize a terminal
    this.#terminalCtrl = new TerminalController(storagePath, globalStoragePath)
  }

  #setState (state: EmulatorState): void {
    this.#state = state
    ext.emulatorStateChanged()
  }

  getState (): EmulatorState {
    return this.#state
  }

  async startEmulator (): Promise<void> {
    // Start the emulator with the service key we gave to the language server.
    this.#setState(EmulatorState.Starting)
    ext.emulatorStateChanged()

    // Start emulator in terminal window
    void this.#terminalCtrl.startEmulator()

    try {
      await this.api.initAccountManager() // Note: seperate from AccountManager class

      const settings = Settings.getWorkspaceSettings()

      const accounts = await this.api.createDefaultAccounts(settings.numAccounts)

      // Add accounts to local data
      for (const account of accounts) {
        void this.#accountManager.addAccountLocal(account)
      }

      await this.#accountManager.setActiveAccount(0)

      this.#setState(EmulatorState.Started)
      ext.emulatorStateChanged()
    } catch (err) {
      console.log('Failed to start emulator')
      this.#setState(EmulatorState.Stopped)
      ext.emulatorStateChanged()
    }
  }

  // Stops emulator, exits the terminal, and removes all config/db files.
  async stopEmulator (): Promise<void> {
    this.#terminalCtrl.resetTerminal()

    this.#setState(EmulatorState.Stopped)

    // Clear accounts and restart language server to ensure account state is in sync.
    this.#accountManager.resetAccounts()
    ext.emulatorStateChanged()
    await this.api.client.stop()

    // Reset the language server
    this.api.reset()
  }

  /* Language Server Interface */
  restartServer (): void {
    void this.api.restartServer()
  }

  /* Account Manager Interface */
  createNewAccount (): void {
    void this.#accountManager.createNewAccount()
  }

  setActiveAccount (activeIndex: number): void {
    void this.#accountManager.setActiveAccount(activeIndex)
  }

  switchActiveAccount (): void {
    this.#accountManager.switchActiveAccount()
  }

  getActiveAccount (): Account | null {
    return this.#accountManager.getActiveAccount()
  }
}
