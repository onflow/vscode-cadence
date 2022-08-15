/* Wrapper functions for Mixpanel analytics */
import * as mixpanel from 'mixpanel'
import { countries, zones } from 'moment-timezone/data/meta/latest.json'

// Mixpanel vscode-cadence
const MIXPANEL_TOKEN: string = '3bf150e1e4b38a9b58286a6c0e888d72'

// True when mixpanel telemetry is active
let mixpanelActivated: boolean = false

// Mixpanel instance
let mixPanel: mixpanel.Mixpanel | undefined

// User information
interface UserInfo {
  vscode_cadence_version: string
  distinct_id: string
  city: string
  country: string
  operating_system: string
}
let userInfo: UserInfo | undefined

export async function mixpanelInit (activate: boolean): Promise<void> {
  mixpanelActivated = activate
  mixPanel = mixpanel.init(MIXPANEL_TOKEN)
}

// Set user information including uid, city, country, and operating system
export function setUserInformation (uid: string, version: string): void {
  let userCity: string = ''
  let userCountry: string = ''

  try {
    const timeZoneCityToCountry: {[key: string]: string} = {}

    Object.keys(zones).forEach(z => {
      const cityArr = z.split('/')
      const city: string = cityArr[cityArr.length - 1]
      timeZoneCityToCountry[city] = countries[zones[z].countries[0]].name
    })

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const tzArr = userTimeZone.split('/')
    userCity = tzArr[tzArr.length - 1]
    userCountry = timeZoneCityToCountry[userCity]
  } catch (err) {
    void err
  }

  let userOS = process.platform === 'darwin' ? 'macOS' : process.platform
  
  userInfo = {
    vscode_cadence_version: version,
    distinct_id: uid,
    city: userCity,
    country: userCountry,
    operating_system: userOS
  }
}

export function captureStatistics (eventName: string, properties: mixpanel.PropertyDict = {}): void {
  if (!mixpanelActivated || mixPanel === undefined) return
  if (userInfo !== undefined) {
    properties.vscode_cadence_version = userInfo.vscode_cadence_version
    properties.distinct_id = userInfo.distinct_id
    properties.$city = userInfo.city
    properties.mp_country_code = userInfo.country
    properties.$os = userInfo.operating_system
  }
  mixPanel.track(eventName, properties)
}
