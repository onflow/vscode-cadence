import { Settings } from '../../src/settings/settings'
import * as path from 'path'

export function getMockSettings (): Settings {
  const mockSettings: Settings = new Settings(true)
  mockSettings.accessCheckMode = 'strict'
  mockSettings.customConfigPath = path.join(__dirname, '../integration/fixtures/workspace/flow.json')
  mockSettings.flowCommand = 'flow'
  return mockSettings
}


