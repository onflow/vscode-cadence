import { Account } from '../account'

export class GetAccountsReponse {
  #accounts: Account[]
  #activeAccountIndex: number
  #activeAccount: Account

  constructor (res: any) {
    this.#accounts = []
    this.#activeAccountIndex = 0

    // TODO: Set accounts and active account index from response

    this.#activeAccount = this.#accounts[this.#activeAccountIndex]
  }

  getAccounts (): Account[] {
    return this.#accounts
  }

  getActiveAccountIndex (): number {
    return this.#activeAccountIndex
  }

  getActiveAccount (): Account {
    return this.#activeAccount
  }
}
