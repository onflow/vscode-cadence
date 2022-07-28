import { Account } from '../account'

export class ClientAccount {
  Address: string
  Balance: number
  Code: string | null
  Keys: []
  Contracts: {}
  Name: string
  Active: boolean

  constructor (obj: any) {
    this.Address = obj.Address
    this.Balance = obj.Balance
    this.Code = obj.Code
    this.Keys = obj.Keys
    this.Contracts = obj.Contracts
    this.Name = obj.Name
    this.Active = obj.Active
  }

  asAccount (): Account {
    return new Account(this.Name, this.Address)
  }
}

export class GetAccountsReponse {
  #accounts: Account[]
  #activeAccountIndex: number
  #activeAccount: Account | null

  constructor (res: any) {
    this.#accounts = []
    this.#activeAccountIndex = 0
    this.#activeAccount = null

    if (res === null) return

    res.forEach((obj, idx) => {
      const client = new ClientAccount(obj)
      const account = client.asAccount()
      account.setIndex(idx)
      this.#accounts.push(account)
      if (client.Active) {
        this.#activeAccountIndex = idx
      }
    })

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
