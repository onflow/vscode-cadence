/* Local data for accounts/ etc */

import { Account } from '../account'

export class AccountData {
  // Set of created accounts for which we can submit transactions.
  // Mapping from account address to account object.
  accounts: Account[]

  // Index of the currently active account.
  activeAccountIndex: number | null

  constructor () {
    this.accounts = []
    this.activeAccountIndex = null
  }

  getNumAccounts (): number {
    return this.accounts.length
  }

  addAccount (account: Account): number {
    const index = this.accounts.length
    account.setIndex(index)
    this.accounts.push(account)
    return index
  }

  setActiveAccount (index: number): void {
    if (index < 0 || index >= this.accounts.length) {
      return
    }
    this.activeAccountIndex = index
  }

  getActiveAccount (): Account | null {
    if (this.activeAccountIndex === null) {
      return null
    }
    return this.getAccount(this.activeAccountIndex)
  }

  getAccount (index: number): Account | null {
    if (index < 0 || index >= this.accounts.length) {
      return null
    }
    return this.accounts[index]
  }

  accountExists (name: string): boolean {
    return this.accounts.findIndex(acc => {
      return acc.name === name
    }) !== -1
  }

  // Resets account state
  resetAccounts (): void {
    this.accounts = []
    this.activeAccountIndex = null
  }
}
