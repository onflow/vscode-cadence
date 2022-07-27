import { DEBUG_LOG } from '../../utils/debug'
import { Account } from '../account'

/*
class ClientAccount {
	*flow.Account
	Name   string
	active bool
}
*/

export class GetAccountsReponse {
  #accounts: Account[]
  #activeAccountIndex: number
  #activeAccount: Account | null

  constructor (res: any) {
    this.#accounts = []
    this.#activeAccountIndex = 0
    this.#activeAccount = null

    // TODO: Set accounts and active account index from response

    if (!res) return

    this.#activeAccount = this.#accounts[this.#activeAccountIndex]
  }

  getAccounts (): Account[] {
    return this.#accounts
  }

  getActiveAccountIndex (): number {
    return this.#activeAccountIndex
  }

  getActiveAccount (): Account | null {
    return this.#activeAccount
  }
}
