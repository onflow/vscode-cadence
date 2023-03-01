/*
EmulatorController is used to communicate with the language server
and synchronize account data with the hosted emulator
*/
import { ext } from '../main'
import { LanguageServerAPI } from './server/language-server'
import { Account } from './account'
import { window, env } from 'vscode'
import { GetAccountsReponse } from './server/responses'
import { promptCopyAccountAddress } from '../ui/prompts'
import { Settings } from '../settings/settings'

export enum EmulatorState {
  Connected = 0,
  Disconnected,
}

export class EmulatorController {
  api: LanguageServerAPI
  #state: EmulatorState
  // Syncronized account data with the LS
  #accountData: GetAccountsReponse

  constructor (settings: Settings) {
    // Initialize state
    this.#state = EmulatorState.Disconnected

    // Initialize the language server
    this.api = new LanguageServerAPI(settings)

    // Initialize account data
    this.#accountData = new GetAccountsReponse(null)
  }

  deactivate (): void {
    // Disconnect from language server
    this.api.deactivate()
  }

  // Called whenever the emulator is updated
  async #syncAccountData (): Promise<void> {
    this.#accountData = await this.api.getAccounts()
  }

  async syncEmulatorState (): Promise<void> {
    if (this.api.emulatorConnected()) {
      this.#state = EmulatorState.Connected
      await this.#syncAccountData()
    } else {
      this.#state = EmulatorState.Disconnected
    }
  }

  getState (): EmulatorState {
    return this.#state
  }

  getActiveAccount (): Account | null {
    if (this.#state === EmulatorState.Connected) {
      return this.#accountData.getActiveAccount()
    } else {
      return null
    }
  }

  restartServer (): void {
    void this.api.reset()
    void window.showInformationMessage('Restarted language server')
  }

  async createNewAccount (): Promise<void> {
    // Create new account on hosted emulator
    const account = await this.api.createAccount()
    void window.showInformationMessage('New account created: ' + account.fullName())

    // Switch active account to the new account
    await this.api.switchActiveAccount(account)

    // Allow user to copy new account address to clipboard
    promptCopyAccountAddress(account)

    // Update UI
    await ext?.emulatorStateChanged()
  }

  // Switches the active account to the option selected by the user. The selection
  // is propagated to the Language Server.
  switchActiveAccount (): void {
    // Create the options (mark the active account with an 'active' prefix)
    const accountOptions = Object.values(this.#accountData.getAccounts())
    // Mark the active account with a `*` in the dialog
      .map((account) => {
        const ACTIVE_PREFIX = '🟢'
        const INACTIVE_PREFIX = '⚫️'
        const prefix: string =
            account.index === this.#accountData.getActiveAccountIndex() ? ACTIVE_PREFIX : INACTIVE_PREFIX
        const label = `${prefix} ${account.fullName()}`

        return {
          label,
          target: account.index
        }
      })

    // Add option to create a new account
    const ADD_NEW_PREFIX = '🐣'
    accountOptions.push({
      label: `${ADD_NEW_PREFIX} ${'Create New Account'}`,
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

      await ext?.emulatorStateChanged()
    }, () => {})
  }

  copyActiveAccount (): void {
    if (this.#state === EmulatorState.Disconnected) return
    const activeAccount = this.#accountData.getActiveAccount()
    if (activeAccount !== null) {
      void env.clipboard.writeText(`${activeAccount.fullName()}`)
        .then(() => {
          void window.showInformationMessage(`Coppied account ${activeAccount.fullName()} to clipboard`)
        })
    }
  }
}
