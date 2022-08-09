/* UI component for the data explorer */
import {
  TreeItem,
  TreeItemCollapsibleState,
  TreeDataProvider,
  window,
  Event,
  EventEmitter
} from 'vscode'

import { GetAccountsReponse } from '../../emulator/server/responses'

export class SidebarUI {
  constructor () {
    window.registerTreeDataProvider(
      'flowView',
      new AccountItemProvider()
    )

    /*
    window.createTreeView('nodeDependencies', {
      treeDataProvider: new AccountItemProvider()
    })
    */
  }

  emulatorStateChanged (): void {

  }
}

class AccountItemProvider implements TreeDataProvider<AccountItem | DeployedContractItem> {
  constructor () {}

  getTreeItem (element: AccountItem | DeployedContractItem): TreeItem {
    return element
  }

  getChildren (element?: AccountItem | DeployedContractItem): Thenable<AccountItem[] | DeployedContractItem[]> {
    if (element instanceof AccountItem) {
      return Promise.resolve(
        this.#getDeployedContracts()
      )
    } else {
      return Promise.resolve([])
    }
  }

  #getDeployedContracts (): DeployedContractItem[] {
    // Parse GetAccountsReponse contracts
    // TODO:
    return []
  }

  // Refresh view
  private readonly _onDidChangeTreeData: EventEmitter<AccountItem | DeployedContractItem | undefined | null | void>
  = new EventEmitter<AccountItem | DeployedContractItem | undefined | null | void>()

  readonly onDidChangeTreeData: Event<AccountItem | DeployedContractItem | undefined | null | void>
  = this._onDidChangeTreeData.event

  refresh (): void {
    this._onDidChangeTreeData.fire()
  }
}

class DeployedContractItem extends TreeItem {
  constructor (
    public readonly label: string,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState)
    this.tooltip = this.label
    this.description = 'Contract: ' + this.label
  }
}

class AccountItem extends TreeItem {
  constructor (
    public readonly name: string, // Name is full name + address
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(name, collapsibleState)
    this.tooltip = this.name
    this.description = 'Account: ' + this.name
  }
}
