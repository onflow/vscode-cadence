/*  AccountManager is responsible for creating and switching accounts.
    It deals with the local configuration and language server.
*/
import { ext } from '../../main'
import { AccountData } from '../local/account-data'
import { LanguageServerAPI } from '../server/language-server'
import { window, env } from 'vscode'
import { Account } from '../account'
import {
  COPY_ADDRESS,
  CREATE_NEW_ACCOUNT,
  ACTIVE_PREFIX,
  INACTIVE_PREFIX,
  ADD_NEW_PREFIX
} from '../../utils/strings'

export class AccountManager {
  api: LanguageServerAPI
  accountData: AccountData

  constructor (api: LanguageServerAPI) {
    this.api = api
    this.accountData = new AccountData()
  }

  async addAccountLocal (account: Account): Promise<void> {
    this.accountData.addAccount(account)
  }

  async createNewAccount (): Promise<void> {
    try {
      const account = await this.api.createAccount()
      const index = this.accountData.addAccount(account)
      await this.setActiveAccount(index)

      ext.emulatorStateChanged()
    } catch (err) {
      window.showErrorMessage(`Failed to create account: ${err.message as string}`)
        .then(() => {}, () => {})
      throw err
    }
  }

  getNumAccounts (): number {
    return this.accountData.getNumAccounts()
  }

  getActiveAccount (): Account | null {
    return this.accountData.getActiveAccount()
  }

  async setActiveAccount (activeIndex: number): Promise<void> {
    const activeAccount = this.accountData.getAccount(activeIndex)

    if (activeAccount == null) {
      window.showErrorMessage('Failed to switch account: account does not exist.')
        .then(() => {}, () => {})
      return
    }

    try {
      await this.api.switchActiveAccount(activeAccount)
      this.accountData.setActiveAccount(activeIndex)

      window.showInformationMessage(
            `Switched to account ${activeAccount.fullName()}`,
            COPY_ADDRESS
      ).then((choice) => {
        if (choice === COPY_ADDRESS) {
          env.clipboard.writeText(`0x${activeAccount.address}`)
            .then(() => {}, () => {})
        }
      }, () => {})

      ext.emulatorStateChanged()
    } catch (err) {
      window.showErrorMessage(`Failed to switch account: ${err.message as string}`)
        .then(() => {}, () => {})
      throw err
    }
  }

  // Switches the active account to the option selected by the user. The selection
  // is propagated to the Language Server.
  switchActiveAccount (): void {
    // Create the options (mark the active account with an 'active' prefix)
    const accountOptions = Object.values(this.accountData.accounts)
    // Mark the active account with a `*` in the dialog
      .map((account) => {
        const prefix: string =
            account.index === this.accountData.activeAccountIndex ? ACTIVE_PREFIX : INACTIVE_PREFIX
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

    window.showQuickPick(accountOptions).then(async (selected) => {
      // `selected` is undefined if the QuickPick is dismissed, and the
      // string value of the selected option otherwise.
      if (selected === undefined) {
        return
      }

      if (selected.target === accountOptions.length - 1) {
        await this.createNewAccount()
        return
      }

      await this.setActiveAccount(selected.target)
      ext.emulatorStateChanged()
    }, () => {})
  }

  resetAccounts (): void {
    this.accountData.resetAccounts()
  }
}
