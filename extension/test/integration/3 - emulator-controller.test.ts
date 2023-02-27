/*
import { EmulatorController } from '../../src/emulator/emulator-controller'
import * as vscode from 'vscode'
import { delay } from '../index'
import { getMockSettings } from '../mock/mockSettings'
import * as flowConfig from '../../src/emulator/local/flowConfig'
import { Settings } from '../../src/settings/settings'
import {CONNECTED, DISCONNECTED, MaxTimeout} from '../globals'
import { before } from 'mocha'
import * as assert from 'assert'

suite('Emulator Controler Integration Tests', () => {
  let emuCtrl: EmulatorController
  let settings: Settings

  before(() => {
    settings = getMockSettings()
    flowConfig.setConfigPath(settings.customConfigPath)
    emuCtrl = new EmulatorController(settings)
  })

  test('Emulator Connection', async () => {
    assert.equal(emuCtrl.getState(), DISCONNECTED)

    //env.clipboard
  }).timeout(MaxTimeout)
})
*/