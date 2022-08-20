/* Information and error prompts */
import { window, env } from 'vscode'
import { Account } from '../emulator/account'

export function promptUserInfoMessage (message: string, buttonText: string, callback: Function): void {
  window.showInformationMessage(
    message,
    buttonText
  ).then((choice) => {
    if (choice === buttonText) {
      callback()
    }
  }, () => {})
}

export function promptUserErrorMessage (message: string, buttonText: string, callback: Function): void {
  window.showErrorMessage(
    message,
    buttonText
  ).then((choice) => {
    if (choice === buttonText) {
      callback()
    }
  }, () => {})
}

export function promptCopyAccountAddress (account: Account): void {
  // Allow user to copy the active account address to clipboard
  window.showInformationMessage(
    `Switched to account ${account.fullName()}`,
    'Copy Address'
  ).then((choice) => {
    if (choice === 'Copy Address') {
      env.clipboard.writeText(`0x${account.address}`)
        .then(() => {}, () => {})
    }
  }, () => {})
}
