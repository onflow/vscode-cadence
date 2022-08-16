/* Wrapper functions for Mixpanel analytics */
import * as mixpanel from 'mixpanel'
import osName from 'os-name'

// Mixpanel vscode-cadence
const MIXPANEL_TOKEN: string = '69e592a84fef909bee58668b5c764ae4'

// True when mixpanel telemetry is active
let mixpanelActivated: boolean = false

// Mixpanel instance
let mixPanel: mixpanel.Mixpanel | undefined

// User information
interface UserInfo {
  vscode_cadence_version: string
  distinct_id: string
  operating_system: string
}
let userInfo: UserInfo | undefined

export async function mixpanelInit (activate: boolean): Promise<void> {
  mixpanelActivated = activate
  mixPanel = mixpanel.init(MIXPANEL_TOKEN)
}

// Set user information including uid, city, country, and operating system
export function setUserInformation (uid: string, version: string): void {
  userInfo = {
    vscode_cadence_version: version,
    distinct_id: uid,
    operating_system: osName()
  }
}

export function captureStatistics (eventName: string, properties: mixpanel.PropertyDict = {}): void {
  if (!mixpanelActivated || mixPanel === undefined) return
  if (userInfo !== undefined) {
    properties.vscode_cadence_version = userInfo.vscode_cadence_version
    properties.distinct_id = userInfo.distinct_id
    properties.$os = userInfo.operating_system
  }
  mixPanel.track(eventName, properties)
}
