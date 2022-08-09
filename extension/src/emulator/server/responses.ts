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

class contractInfo {
  uri: any
  documentVersion: number
  startPos: any
  kind: any
  name: string
  parameters: any[]
  pragmaArgumentStrings: string[]
  pragmaArguments: any[][]
  pragmaSignersNames: string[]

  constructor (obj: any) {
    this.uri = obj.uri
    this.documentVersion = obj.documentVersion
    this.startPos = obj.startPos
    this.kind = obj.kind
    this.name = obj.name
    this.parameters = obj.parameters
    this.pragmaArgumentStrings = obj.pragmaArgumentStrings
    this.pragmaArguments = obj.pragmaArguments
    this.pragmaSignersNames = obj.pragmaSignersNames
  }

  getName (): string {
    return this.name
  }
}

/* Contract info in LS contracts.go
type contractInfo struct {
	uri                   protocol.DocumentURI
	documentVersion       int32
	startPos              *ast.Position
	kind                  contractKind
	name                  string
	parameters            []*sema.Parameter
	pragmaArgumentStrings []string
	pragmaArguments       [][]Argument
	pragmaSignersNames    []string
}
*/

/* Response to hold all account data needed by the extension */
export class GetAccountsReponse {
  #accounts: Account[]
  #contracts: contractInfo[]
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
      console.log("CTRACT")
      console.log(client.Contracts)
      this.#contracts.push(new contractInfo(client.Contracts))
    })

    this.#activeAccount = this.#accounts[this.#activeAccountIndex]
  }

  getAccounts (): Account[] {
    console.log('CONTRACTS: ')
    this.#contracts.forEach((contract) => {
      console.log(contract.getName())
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
