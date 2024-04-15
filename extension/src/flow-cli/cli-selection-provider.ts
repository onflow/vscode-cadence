import * as vscode from 'vscode'
import { zip } from 'rxjs'
import { CliProvider } from './cli-provider'
import { SemVer } from 'semver'
import { CliBinary } from './binary-versions-provider'

const CHANGE_CLI_BINARY = 'cadence.changeFlowCliBinary'
const CADENCE_V1_CLI_REGEX = /-cadence-v1.0.0/g
// label with icon
const GET_BINARY_LABEL = (version: SemVer): string => `Flow CLI v${version.format()}`

export class CliSelectionProvider {
  #statusBarItem: vscode.StatusBarItem | undefined
  #cliProvider: CliProvider
  #showSelector: boolean = false
  #versionSelector: vscode.QuickPick<AvailableBinaryItem | CustomBinaryItem> | undefined
  #disposables: vscode.Disposable[] = []

  constructor (cliProvider: CliProvider) {
    this.#cliProvider = cliProvider

    // Register the command to toggle the version
    this.#disposables.push(vscode.commands.registerCommand(CHANGE_CLI_BINARY, async () => {
      this.#cliProvider.refresh()
      await this.#toggleSelector(true)
    }))

    // Register UI components
    zip(this.#cliProvider.currentBinary$, this.#cliProvider.binaryVersions$).subscribe(() => {
      void this.#refreshSelector()
    })
    this.#cliProvider.currentBinary$.subscribe((binary) => {
      this.#statusBarItem?.dispose()
      this.#statusBarItem = this.#createStatusBarItem(binary?.version ?? null)
      this.#statusBarItem.show()
    })
  }

  #createStatusBarItem (version: SemVer | null): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1)
    statusBarItem.command = CHANGE_CLI_BINARY
    statusBarItem.color = new vscode.ThemeColor('statusBar.foreground')
    statusBarItem.tooltip = 'Click to change the Flow CLI version'

    if (version != null) {
      statusBarItem.text = GET_BINARY_LABEL(version)
    } else {
      statusBarItem.text = '$(error) Flow CLI not found'
      statusBarItem.color = new vscode.ThemeColor('errorForeground')
    }

    return statusBarItem
  }

  #createVersionSelector (currentBinary: CliBinary | null, availableBinaries: CliBinary[]): vscode.QuickPick<AvailableBinaryItem | CustomBinaryItem> {
    const versionSelector = vscode.window.createQuickPick<AvailableBinaryItem | CustomBinaryItem>()
    versionSelector.title = 'Select a Flow CLI version'

    // Update selected binary when the user selects a version
    this.#disposables.push(versionSelector.onDidAccept(async () => {
      if (versionSelector.selectedItems.length === 0) return
      await this.#toggleSelector(false)

      const selected = versionSelector.selectedItems[0]

      if (selected instanceof CustomBinaryItem) {
        void vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          openLabel: 'Choose a Flow CLI binary'
        }).then((uri) => {
          if (uri != null) {
            void this.#cliProvider.setCurrentBinary(uri[0].fsPath)
          }
        })
      } else if (selected instanceof AvailableBinaryItem) {
        void this.#cliProvider.setCurrentBinary(selected.path)
      }
    }))

    // Update available versions
    const items: Array<AvailableBinaryItem | CustomBinaryItem> = availableBinaries.map(binary => new AvailableBinaryItem(binary))
    items.push(new CustomBinaryItem())

    // Hoist the current binary to the top of the list
    const currentBinaryIndex = items.findIndex(item => item instanceof AvailableBinaryItem && item.path === currentBinary?.path)
    if (currentBinaryIndex != null) {
      const currentBinaryItem = items[currentBinaryIndex]
      items.splice(currentBinaryIndex, 1)
      items.unshift(currentBinaryItem)
    }

    versionSelector.items = items
    return versionSelector
  }

  async #toggleSelector (show: boolean): Promise<void> {
    this.#showSelector = show
    await this.#refreshSelector()
  }

  async #refreshSelector (): Promise<void> {
    if (this.#showSelector) {
      this.#versionSelector?.dispose()
      const currentBinary = await this.#cliProvider.getCurrentBinary()
      const availableBinaries = await this.#cliProvider.getBinaryVersions()
      this.#versionSelector = this.#createVersionSelector(currentBinary, availableBinaries)
      this.#disposables.push(this.#versionSelector)
      this.#versionSelector.show()
    } else {
      this.#versionSelector?.dispose()
    }
  }

  dispose (): void {
    this.#disposables.forEach(disposable => disposable.dispose())
    this.#statusBarItem?.dispose()
    this.#versionSelector?.dispose()
  }
}

class AvailableBinaryItem implements vscode.QuickPickItem {
  detail?: string
  picked?: boolean
  alwaysShow?: boolean
  #binary: CliBinary

  constructor (binary: CliBinary) {
    this.#binary = binary
  }

  get label (): string {
    return GET_BINARY_LABEL(this.#binary.version)
  }

  get description (): string {
    return `(${this.#binary.path})`
  }

  get path (): string {
    return this.#binary.path
  }
}

class CustomBinaryItem implements vscode.QuickPickItem {
  label: string

  constructor () {
    this.label = 'Choose a custom version...'
  }
}

export function isCliCadenceV1 (version: SemVer): boolean {
  return CADENCE_V1_CLI_REGEX.test(version.raw)
}
