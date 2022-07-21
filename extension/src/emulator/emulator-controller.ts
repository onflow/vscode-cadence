/*
EmulatorController is used to execute commands on the Flow emulator
Communicates with local configs and language-server data
*/
import { ext } from '../main'
import { LanguageServerAPI } from './server/language-server'
import {
  CREATE_NEW_ACCOUNT,
  ACTIVE_PREFIX,
  INACTIVE_PREFIX,
  ADD_NEW_PREFIX
} from '../utils/strings'
import { Account } from './account'
import { window } from 'vscode'
import { GetAccountsReponse } from './server/responses'
import { promptCopyAccountAddress } from '../utils/utils'

export enum EmulatorState {
  Stopped = 0,
  Starting,
  Started,
}

export class EmulatorController {
  api: LanguageServerAPI
  #state: EmulatorState
  // Syncronized account data with the LS
  #accountData!: GetAccountsReponse

  constructor () {
    // Initialize state
    this.#state = EmulatorState.Stopped

    // Initialize the language server and hosted emulator
    this.api = new LanguageServerAPI()
  }

  deactivate (): void {
    // Disconnect from language server
    this.api.deactivate()
  }

  // Called whenever the emulator is updated
  async syncAccountData (): Promise<void> {
    this.#accountData = await this.api.getAccounts()
  }

  #setState (state: EmulatorState): void {
    this.#state = state
    ext.emulatorStateChanged()
  }

  getState (): EmulatorState {
    return this.#state
  }

  getActiveAccount (): Account {
    return this.#accountData.getActiveAccount()
  }

  async startEmulator (): Promise<void> {
    try {
      this.#setState(EmulatorState.Started)
      ext.emulatorStateChanged()
      void window.showInformationMessage('Flow emulated started')
    } catch (err) {
      void window.showErrorMessage('Flow emulator failed to start')
      this.#setState(EmulatorState.Stopped)
      ext.emulatorStateChanged()
      throw err
    }
  }

  // Stops the emulator by resetting the LS
  async stopEmulator (): Promise<void> {
    // Reset the language server
    this.api.reset()

    // Set new state
    this.#setState(EmulatorState.Stopped)
    ext.emulatorStateChanged()
    void window.showInformationMessage('Flow emulated stopped')
  }

  restartServer (): void {
    void this.api.restartServer()
    ext.emulatorStateChanged()
    void window.showInformationMessage('Restarted language server')
  }

  async createNewAccount (): Promise<void> {
    // Create new account on hosted emulator
    const account = await this.api.createAccount()

    // Switch active account to the new account
    await this.api.switchActiveAccount(account)

    // Allow user to copy new account address to clipboard
    promptCopyAccountAddress(account)

    // Update UI
    ext.emulatorStateChanged()
  }

  // Switches the active account to the option selected by the user. The selection
  // is propagated to the Language Server.
  switchActiveAccount (): void {
    // Create the options (mark the active account with an 'active' prefix)
    const accountOptions = Object.values(this.#accountData.getAccounts())
    // Mark the active account with a `*` in the dialog
      .map((account) => {
        const prefix: string =
            account.index === this.#accountData.getActiveAccountIndex() ? ACTIVE_PREFIX : INACTIVE_PREFIX
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

    // Display account selection options
    window.showQuickPick(accountOptions).then(async (selected) => {
      // `selected` is undefined if the QuickPick is dismissed, and the
      // string value of the selected option otherwise.
      if (selected === undefined) {
        return
      }

      // Check if create new account is selected
      if (selected.target === accountOptions.length - 1) {
        await this.createNewAccount()
        return
      }

      // Switch active account to selected
      const setActive: Account = this.#accountData.getAccounts()[selected.target]
      await this.api.switchActiveAccount(setActive)

      promptCopyAccountAddress(setActive)

      ext.emulatorStateChanged()
    }, () => {})
  }
}
