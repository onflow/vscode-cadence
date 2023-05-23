import { Settings } from '../../src/settings/settings'
import * as path from 'path'

export function getMockSettings (): Settings {
  const mockSettings: Settings = new Settings(true)
  mockSettings.accessCheckMode = 'strict'
  mockSettings.customConfigPath = path.join(__dirname, '../integration/fixtures/workspace/flow.json')
  mockSettings.flowCommand = 'flow'
  if (process.platform === 'win32') {
    // Target GitHub Windows runner location for flow command
    mockSettings.flowCommand = 'C:\\Users\\runneradmin\\AppData\\Roaming\\Flow\\flow.exe'
  }
  mockSettings.numAccounts = 3
  return mockSettings
}
