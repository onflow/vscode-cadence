/* Wrapper functions for Mixpanel analytics */
import * as mixpanel from 'mixpanel'

// Mixpanel vscode-cadence
const MIXPANEL_TOKEN: string = '69e592a84fef909bee58668b5c764ae4'
const DEV_FUNNEL_TOKEN: string = '776159d170484f49f19c3c2f7339f297'

export enum MixpanelSelector {
  VSCODE = 0,
  DEV_FUNNEL = 1
}

// True when mixpanel telemetry is active
let mixpanelActivated: boolean = false

// Mixpanel instance
let mixPanel: mixpanel.Mixpanel

// Dev funnel Mixpanel
let devFunnel: mixpanel.Mixpanel

// User information
let userInfo: {
  vscode_cadence_version: string
  distinct_id: string
  operating_system: string
}

// Events to capture
export enum Events {
  ExtensionActivated = 'Extension Activated',
  UnhandledException = 'Unhandled Exception',
  PlaygroundProjectOpened = 'Playground Project Opened',
  PlaygroundProjectDeployed = 'Playground Project Deployed'
}

export async function mixpanelInit (activate: boolean, uid: string, version: string): Promise<void> {
  const osName = await import('os-name')
  mixpanelActivated = activate
  if (!mixpanelActivated) return

  mixPanel = mixpanel.init(MIXPANEL_TOKEN)
  devFunnel = mixpanel.init(DEV_FUNNEL_TOKEN)

  userInfo = {
    vscode_cadence_version: version,
    distinct_id: uid,
    operating_system: osName.default()
  }
}

export function captureException (err: any): void {
  if (!mixpanelActivated) return
  const errProperties = Object.getOwnPropertyNames(err)
  const mixpanelProperties: mixpanel.PropertyDict = {}

  // Extract properties from the error
  errProperties.forEach((elem) => {
    type ObjectKey = keyof typeof err
    mixpanelProperties[elem] = err[elem as ObjectKey]
  })

  captureEvent(MixpanelSelector.VSCODE, Events.UnhandledException, mixpanelProperties)
}

export function captureEvent (selector: MixpanelSelector, eventName: string, properties: mixpanel.PropertyDict = {}): void {
  if (!mixpanelActivated) return

  // Add user information
  properties.vscode_cadence_version = userInfo.vscode_cadence_version
  properties.distinct_id = userInfo.distinct_id
  properties.$os = userInfo.operating_system

  // Track event data
  switch (selector) {
    case MixpanelSelector.VSCODE:
      mixPanel.track(eventName, properties)
      break
    case MixpanelSelector.DEV_FUNNEL:
      devFunnel.track(eventName, properties)
      break
    default:
      console.log('Unknown mixpanel selector type')
  }
}
