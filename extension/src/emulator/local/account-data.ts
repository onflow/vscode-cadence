/* Local data for accounts/ etc */

import { Account } from '../account'

export class AccountData {
  // Set of created accounts for which we can submit transactions.
  // Mapping from account address to account object.
  accounts: Account[]

  // Index of the currently active account.
  activeAccount: number | null

  constructor () {
    this.accounts = []
    this.activeAccount = null
  }

  getNumAccounts (): number {
    return this.accounts.length
  }

  addAccount (account: Account): void {
    const index = this.accounts.length
    account.setIndex(index)
    this.accounts.push(account)
  }

  setActiveAccount (index: number): void {
    if (index < 0 || index >= this.accounts.length) {
      return
    }
    this.activeAccount = index
  }

  getActiveAccount (): Account | null {
    if (this.activeAccount === null) {
      return null
    }
    return this.getAccount(this.activeAccount)
  }

  getAccount (index: number): Account | null {
    if (index < 0 || index >= this.accounts.length) {
      return null
    }
    return this.accounts[index]
  }

  accountExists (name: string): boolean {
    return this.accounts.filter(acc => {
      return acc.name === name
    }).length > 0
  }

  // Resets account state
  resetAccounts (): void {
    this.accounts = []
    this.activeAccount = null
  }
}
