import { execSync } from 'child_process'
import {
  Position,
  Range,
  window
  , env
} from 'vscode'
import { Account } from '../emulator/account'
import { COPY_ADDRESS } from './strings'

export const FILE_PATH_EMPTY = ''

export function promptCopyAccountAddress (account: Account): void {
  // Allow user to copy the active account address to clipboard
  window.showInformationMessage(
    `Switched to account ${account.fullName()}`,
    COPY_ADDRESS
  ).then((choice) => {
    if (choice === COPY_ADDRESS) {
      env.clipboard.writeText(`0x${account.address}`)
        .then(() => {}, () => {})
    }
  }, () => {})
}

// This method will add and then remove a space on the last line to trick codelens to be updated
export const refreshCodeLenses = (): void => {
  window.visibleTextEditors.forEach((editor) => {
    if (editor.document.lineCount !== 0) {
      return
    }
    // NOTE: We add a space to the end of the last line to force
    // Codelens to refresh.
    const lineCount = editor.document.lineCount
    const lastLine = editor.document.lineAt(lineCount - 1)
    editor.edit((edit) => {
      if (lastLine.isEmptyOrWhitespace) {
        edit.insert(new Position(lineCount - 1, 0), ' ')
        edit.delete(new Range(lineCount - 1, 0, lineCount - 1, 1000))
      } else {
        edit.insert(new Position(lineCount - 1, 1000), '\n')
      }
    }).then(() => {}, () => {})
  })
}

// Execute a command in powershell; returns false on error
export function execPowerShell (cmd: string): boolean {
  try {
    execSync(cmd, { shell: 'powershell.exe' })
  } catch (err) {
    return false
  }
  return true
}

// Execute command in default shell; returns false on error
export function execDefault (cmd: string): boolean {
  try {
    execSync(cmd)
  } catch (err) {
    return false
  }
  return true
}
