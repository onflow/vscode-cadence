import { zip } from 'rxjs'
import { CliBinary, CliProvider } from './cli-provider'
import { SemVer } from 'semver'
import * as vscode from 'vscode'

const TOGGLE_CADENCE_VERSION_COMMAND = 'cadence.changeCadenceVersion'
const CADENCE_V1_CLI_REGEX = /-cadence-v1.0.0/g
const GET_BINARY_LABEL = (version: SemVer): string => `Flow CLI v${version.format()}`

export class CliSelectionProvider implements vscode.Disposable {
  #statusBarItem: vscode.StatusBarItem | undefined
  #cliProvider: CliProvider
  #showSelector: boolean = false
  #versionSelector: vscode.QuickPick<AvailableBinaryItem | CustomBinaryItem> | undefined
  #disposables: vscode.Disposable[] = []

  constructor (cliProvider: CliProvider) {
    this.#cliProvider = cliProvider

    // Register the command to toggle the version
    vscode.commands.registerCommand(TOGGLE_CADENCE_VERSION_COMMAND, async () => await this.#toggleSelector(true))

    // Register UI components
    zip(this.#cliProvider.currentBinary$, this.#cliProvider.availableBinaries$).subscribe(() => {
      void this.#refreshSelector()
    })
    this.#cliProvider.currentBinary$.subscribe((binary) => {
      if (binary === null) return
      this.#statusBarItem?.dispose()
      this.#statusBarItem = this.#createStatusBarItem(binary?.version)
      this.#statusBarItem.show()
    })
  }

  #createStatusBarItem (version: SemVer): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1)
    statusBarItem.command = TOGGLE_CADENCE_VERSION_COMMAND
    statusBarItem.color = new vscode.ThemeColor('statusBar.foreground')
    statusBarItem.tooltip = 'Click to change the Flow CLI version'

    // Update the status bar text when the version changes
    statusBarItem.text = GET_BINARY_LABEL(version)

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
        void vscode.window.showInputBox({
          placeHolder: 'Enter the path to the Flow CLI binary',
          prompt: 'Enter the path to the Flow CLI binary'
        }).then((path) => {
          if (path != null) {
            this.#cliProvider.setCurrentBinary(path)
          }
        })
      } else if (selected instanceof AvailableBinaryItem) {
        this.#cliProvider.setCurrentBinary(selected.path)
      }
    }))

    // Update available versions
    const items: Array<AvailableBinaryItem | CustomBinaryItem> = availableBinaries.map(binary => new AvailableBinaryItem(binary))
    items.push(new CustomBinaryItem())
    versionSelector.items = items

    // Select the current binary
    if (currentBinary !== null) {
      const currentBinaryItem = versionSelector.items.find(item => item instanceof AvailableBinaryItem && item.path === currentBinary.name)
      console.log(currentBinaryItem)
      if (currentBinaryItem != null) {
        versionSelector.selectedItems = [currentBinaryItem]
      }
    }

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
      const availableBinaries = await this.#cliProvider.getAvailableBinaries()
      this.#versionSelector = this.#createVersionSelector(currentBinary, availableBinaries)
      this.#disposables.push(this.#versionSelector)
      this.#versionSelector.show()
    } else {
      this.#versionSelector?.dispose()
    }
  }

  dispose (): void {
    this.#disposables.forEach(disposable => disposable.dispose())
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
    return `(${this.#binary.name})`
  }

  get path (): string {
    return this.#binary.name
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
