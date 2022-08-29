/* Wrapper functions for Mixpanel analytics */
import * as mixpanel from 'mixpanel'
import osName from 'os-name'

// Mixpanel vscode-cadence
const MIXPANEL_TOKEN: string = '69e592a84fef909bee58668b5c764ae4'

// True when mixpanel telemetry is active
let mixpanelActivated: boolean = false

// Mixpanel instance
let mixPanel: mixpanel.Mixpanel

// User information
let userInfo: {
  vscode_cadence_version: string
  distinct_id: string
  operating_system: string
}

// Events to capture
export enum Events {
  ExtensionActivated = 'Extension Activated',
  UnhandledException = 'Unhandled Exception'
}

export async function mixpanelInit (activate: boolean, uid: string, version: string): Promise<void> {
  mixpanelActivated = activate
  if (!mixpanelActivated) return

  mixPanel = mixpanel.init(MIXPANEL_TOKEN)

  userInfo = {
    vscode_cadence_version: version,
    distinct_id: uid,
    operating_system: osName()
  }
}

export function captureEvent (eventName: string, properties: mixpanel.PropertyDict = {}): void {
  if (!mixpanelActivated) return

  // Add user information
  properties.vscode_cadence_version = userInfo.vscode_cadence_version
  properties.distinct_id = userInfo.distinct_id
  properties.$os = userInfo.operating_system

  // Track event data
  mixPanel.track(eventName, properties)
}
