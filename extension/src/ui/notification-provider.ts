import { StorageProvider } from '../storage/storage-provider'
import { promptUserErrorMessage, promptUserInfoMessage, promptUserWarningMessage } from './prompts'
import * as vscode from 'vscode'

const NOTIFICATIONS_URL = 'https://raw.githubusercontent.com/onflow/vscode-cadence/.metadata/notifications.json'

export interface Notification {
  _type: 'Notification'
  id: string
  type: 'error' | 'info' | 'warning'
  text: string
  buttons?: Array<{
    label: string
    link: string
  }>
  suppressable?: boolean
}

export class NotificationProvider {
  #storageProvider: StorageProvider

  constructor(
    storageProvider: StorageProvider
  ) {
    this.#storageProvider = storageProvider
  }

  activate () {
    void this.#fetchAndDisplayNotifications()
  }

  async #fetchAndDisplayNotifications (): Promise<void> {
    // Fetch notifications
    const notifications = await this.#fetchNotifications()
    
    // Display all valid notifications
    notifications
      .filter(this.#notificationFilter.bind(this))
      .forEach(this.#displayNotification.bind(this))
  }

  #displayNotification (notification: Notification): void {
    const transformButton = (button: { label: string, link: string }): { label: string, callback: () => void } => {
      return {
        label: button.label,
        callback: () => {
          void vscode.env.openExternal(vscode.Uri.parse(button.link))
        }
      }
    }

    // Transform buttons
    let buttons: Array<{ label: string, callback: () => void }> = []
    if (notification.suppressable === true) {
      buttons = [{
        label: 'Don\'t show again',
        callback: () => {
          this.#dismissNotification(notification)
        }
      }]
    }
    buttons = buttons?.concat(notification.buttons?.map(transformButton) ?? [])
  
    if (notification.type === 'error') {
      promptUserErrorMessage(notification.text, buttons)
    } else if (notification.type === 'info') {
      promptUserInfoMessage(notification.text, buttons)
    } else if (notification.type === 'warning') {
      promptUserWarningMessage(notification.text, buttons)
    }
  }

  #notificationFilter (notification: Notification): boolean {
    if (notification.suppressable === true && this.#isNotificationDismissed(notification)) {
      return false
    }

    return true
  }

  async #fetchNotifications (): Promise<Notification[]> {
    return await fetch(NOTIFICATIONS_URL).then(async res => await res.json()).then((notifications: Notification[]) => {
      return notifications
    }).catch(() => {
      return []
    })
  }

  #dismissNotification (notification: Notification): void {
    const dismissedNotifications = this.#storageProvider.get('dismissedNotifications', [])
    void this.#storageProvider.set('dismissedNotifications', [...dismissedNotifications, notification.id])
  }

  #isNotificationDismissed (notification: Notification): boolean {
    const dismissedNotifications = this.#storageProvider.get('dismissedNotifications', [])
    return dismissedNotifications.includes(notification.id)
  }
}