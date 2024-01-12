import { StorageProvider } from '../storage/storage-provider'
import { promptUserErrorMessage, promptUserInfoMessage, promptUserWarningMessage } from './prompts'
import * as vscode from 'vscode'
import * as semver from 'semver'

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
  compatibility?: {
    'vscode-cadence'?: string
    'flow-cli'?: string
  }
}

export class NotificationProvider {
  #storageProvider: StorageProvider

  constructor(storageProvider: StorageProvider) {
    this.#storageProvider = storageProvider
  }

  activate () {
    this.#fetchAndDisplayNotifications()
  }

  #fetchAndDisplayNotifications = async (): Promise<void> => {
    const currentVersions = {
      'vscode-cadence': vscode.extensions.getExtension('onflow.vscode-cadence')?.packageJSON.version ?? '0.0.0',
      'flow-cli': vscode.extensions.getExtension('onflow.flow-cli')?.packageJSON.version ?? '0.0.0'
    }
    const notifications = await this.#fetchNotifications()
    const filteredNotifications = this.#filterNotifications(notifications, this.#storageProvider, currentVersions)
    this.#displayNotifications(filteredNotifications)
  }

  #displayNotifications (notifications: Notification[]): void {
    notifications.forEach(notification => {
      this.#displayNotification(notification)
    })
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
    const transformButtons = (buttons?: Array<{ label: string, link: string }>): Array<{ label: string, callback: () => void }> => {
      return [{
        label: 'Don\'t show again',
        callback: () => {
          this.#dismissNotification(notification)
        }
      }].concat(buttons?.map(transformButton) ?? [])
    }
  
    if (notification.type === 'error') {
      promptUserErrorMessage(notification.text, transformButtons(notification.buttons))
    } else if (notification.type === 'info') {
      promptUserInfoMessage(notification.text, transformButtons(notification.buttons))
    } else if (notification.type === 'warning') {
      promptUserWarningMessage(notification.text, transformButtons(notification.buttons))
    }
  }

  #filterNotifications (notifications: Notification[], storageProvider: StorageProvider, currentVersions: { 'vscode-cadence': string, 'flow-cli': string }): Notification[] {
    return notifications.filter(notification => {
      if (notification.suppressable === true && this.#isNotificationDismissed(notification)) {
        return false
      }
  
      // Check compatibility filters
      const satisfies = (version: string, range?: string): boolean => {
        if (range == null) return true
        return semver.satisfies(version, range, { includePrerelease: true })
      }
      const allSatisfied = Object.keys(currentVersions).every((key) => {
        return satisfies(currentVersions[key as keyof typeof currentVersions], notification.compatibility?.[key as keyof typeof notification.compatibility])
      })
  
      if (!allSatisfied) {
        return false
      }
  
      return true
    })
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