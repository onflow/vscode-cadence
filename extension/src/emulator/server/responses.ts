/* Defines response types from the language server */
import { Account } from '../account'

/* LS responds with account information in this format */
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

/* Response to hold all account data needed by the extension */
export class GetAccountsReponse {
  #accounts: Account[]
  #contracts: any[]
  #activeAccountIndex: number
  #activeAccount: Account | null

  constructor (res: any) {
    this.#accounts = []
    this.#contracts = []
    this.#activeAccountIndex = 0
    this.#activeAccount = null

    if (res === null) return

    res.forEach((obj: any, idx: number) => {
      const client = new ClientAccount(obj)
      const account = client.asAccount()
      account.setIndex(idx)
      this.#accounts.push(account)
      if (client.Active) {
        this.#activeAccountIndex = idx
      }
      this.#contracts.push(client.Contracts)
    })

    this.#activeAccount = this.#accounts[this.#activeAccountIndex]
  }

  getAccounts (): Account[] {
    console.log('CONTRACTS: ')
    this.#contracts.forEach((dict) => {
      for (let key in dict) {
        let value = this.#contracts[key]
        // Use `key` and `value`
        console.log('key, value: ', key, value)
      }
    })

    return this.#accounts
  }

  getActiveAccountIndex (): number {
    return this.#activeAccountIndex
  }

  getActiveAccount (): Account | null {
    return this.#activeAccount
  }

  getContracts (): {} {
    console.log('CONTRACTS: ', this.#contracts)
    return this.#contracts
  }
}
