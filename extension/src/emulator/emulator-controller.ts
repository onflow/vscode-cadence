/*
EmulatorController is used to communicate with the language server
and synchronize account data with the hosted emulator
*/
import { ext } from '../main'
import { LanguageServerAPI, EmulatorState } from './server/language-server'
import { Account } from './account'
import { window, env } from 'vscode'
import { GetAccountsReponse } from './server/responses'
import { promptCopyAccountAddress } from '../ui/prompts'
import { Settings } from '../settings/settings'
import { StateCache } from '../utils/state-cache'

export class EmulatorController {
  api: LanguageServerAPI
  // Syncronized account data with the LS
  #accountData: StateCache<GetAccountsReponse>

  constructor (settings: Settings) {
    // Initialize the language server
    this.api = new LanguageServerAPI(settings)

    // Initialize account data
    this.#accountData = new StateCache(async () => {
      if (this.api.emulatorState$.getValue() !== EmulatorState.Connected) return await Promise.resolve(new GetAccountsReponse(null))
      return await this.api.getAccounts()
    })

    // Subscribe to state changes
    this.api.emulatorState$.subscribe(() => {
      void this.syncEmulatorState()
    })
  }

  async activate (): Promise<void> {
    // Connect to language server
    await this.api.activate()
  }

  async deactivate (): Promise<void> {
    // Disconnect from language server
    await this.api.deactivate()
  }

  async syncEmulatorState (): Promise<void> {
    this.#accountData.invalidate()
    await this.#accountData.getValue()
  }

  getState (): EmulatorState {
    return this.api.emulatorState$.getValue()
  }

  async getActiveAccount (): Promise<Account | null> {
    if (this.getState() === EmulatorState.Connected) {
      return (await this.#accountData.getValue()).getActiveAccount()
    } else {
      return null
    }
  }

  async restartServer (): Promise<void> {
    await this.api.restart()
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
    await this.syncEmulatorState()
  }

  // Switches the active account to the option selected by the user. The selection
  // is propagated to the Language Server.
  async switchActiveAccount (): Promise<void> {
    // Create the options (mark the active account with an 'active' prefix)
    const accountOptions = await Promise.all(Object.values((await this.#accountData.getValue()).getAccounts())
    // Mark the active account with a `*` in the dialog
      .map(async (account) => {
        const ACTIVE_PREFIX = '🟢'
        const INACTIVE_PREFIX = '⚫️'
        const prefix: string =
            account.index === (await this.#accountData.getValue()).getActiveAccountIndex() ? ACTIVE_PREFIX : INACTIVE_PREFIX
        const label = `${prefix} ${account.fullName()}`

        return {
          label,
          target: account.index
        }
      }))

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
      const setActive: Account = (await this.#accountData.getValue()).getAccounts()[selected.target]
      await this.api.switchActiveAccount(setActive)

      promptCopyAccountAddress(setActive)

      await ext?.emulatorStateChanged()
    }, () => {})
  }

  async copyActiveAccount (): Promise<void> {
    if (this.getState() === EmulatorState.Disconnected) return
    const activeAccount = (await this.#accountData.getValue()).getActiveAccount()
    if (activeAccount !== null) {
      void env.clipboard.writeText(`${activeAccount.fullName()}`)
        .then(() => {
          void window.showInformationMessage(`Coppied account ${activeAccount.fullName()} to clipboard`)
        })
    }
  }
}
