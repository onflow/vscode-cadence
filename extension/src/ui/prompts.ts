/* Information and error prompts */
import { window } from "vscode"

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
