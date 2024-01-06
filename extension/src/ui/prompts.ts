/* Information and error prompts */
import { window } from 'vscode'

export interface PromptButton {
  label: string
  callback: Function
}

export function promptUserInfoMessage (message: string, buttons: PromptButton[] = []): void {
  window.showInformationMessage(
    message,
    ...buttons.map((button) => button.label)
  ).then((choice) => {
    const button = buttons.find((button) => button.label === choice)
    if (button != null) {
      button.callback()
    }
  }, () => {})
}

export function promptUserErrorMessage (message: string, buttons: PromptButton[] = []): void {
  window.showErrorMessage(
    message,
    ...buttons.map((button) => button.label)
  ).then((choice) => {
    const button = buttons.find((button) => button.label === choice)
    if (button != null) {
      button.callback()
    }
  }, () => {})
}

export function promptUserWarningMessage (message: string, buttons: PromptButton[] = []): void {
  window.showWarningMessage(
    message,
    ...buttons.map((button) => button.label)
  ).then((choice) => {
    const button = buttons.find((button) => button.label === choice)
    if (button != null) {
      button.callback()
    }
  }, () => {})
}
