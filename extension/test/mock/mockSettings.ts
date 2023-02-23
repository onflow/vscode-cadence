import { Settings } from '../../src/settings/settings'
import * as path from 'path'

export function getMockSettings(): Settings {
  var mockSettings: Settings = new Settings()
  mockSettings.accessCheckMode = 'strict'
  mockSettings.customConfigPath = path.join(__dirname, '../integration/fixtures/workspace/flow.json')
  mockSettings.flowCommand = 'flow'
  mockSettings.numAccounts = 3
  return mockSettings
}
