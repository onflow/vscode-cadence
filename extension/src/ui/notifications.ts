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

export function displayNotifications (notifications: Notification[], storageProvider: StorageProvider): void {
  notifications.forEach(notification => {
    displayNotification(notification, storageProvider)
  })
}

export function displayNotification (notification: Notification, storageProvider: StorageProvider): void {
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
        dismissNotification(notification, storageProvider)
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

export function filterNotifications (notifications: Notification[], storageProvider: StorageProvider, currentVersions: { 'vscode-cadence': string, 'flow-cli': string }): Notification[] {
  return notifications.filter(notification => {
    if (notification.suppressable === true && isNotificationDismissed(notification, storageProvider)) {
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

export async function fetchNotifications (filterNotifications: (notifications: Notification[]) => Notification[]): Promise<Notification[]> {
  return await fetch(NOTIFICATIONS_URL).then(async res => await res.json()).then((notifications: Notification[]) => {
    return filterNotifications(notifications)
  }).catch(() => {
    return []
  })
}

export function dismissNotification (notification: Notification, storageProvider: StorageProvider): void {
  const dismissedNotifications = storageProvider.get('dismissedNotifications', [])
  void storageProvider.set('dismissedNotifications', [...dismissedNotifications, notification.id])
}

export function isNotificationDismissed (notification: Notification, storageProvider: StorageProvider): boolean {
  const dismissedNotifications = storageProvider.get('dismissedNotifications', [])
  return dismissedNotifications.includes(notification.id)
}
