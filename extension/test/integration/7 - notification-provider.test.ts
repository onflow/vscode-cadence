import * as vscode from 'vscode'
import * as sinon from 'sinon'
import { StorageProvider } from "../../src/storage/storage-provider"
import { NotificationProvider } from "../../src/ui/notification-provider"

suite('notificaitons tests', () => {
  let mockGlobalState: vscode.Memento
  let storage: StorageProvider
  let notifications: NotificationProvider

  let fetchSpy: sinon.SinonSpy<any, any>
  let promptSpy: {
    info: sinon.SinonSpy<any, any>
    warning: sinon.SinonSpy<any, any>
    error: sinon.SinonSpy<any, any>
  }

  beforeEach(async function () {
    this.timeout(5000)

    let state = new Map<string, any>()
    mockGlobalState = {
      get: (key: string) => state.get(key),
      update: (key: string, value: any) => state.set(key, value),
    } as any
    storage = new StorageProvider(mockGlobalState)
    notifications = new NotificationProvider(storage)

    fetchSpy = sinon.stub(globalThis, 'fetch')
    promptSpy = {
      info: sinon.stub(vscode.window, 'showInformationMessage'),
      warning: sinon.stub(vscode.window, 'showWarningMessage'),
      error: sinon.stub(vscode.window, 'showErrorMessage'),
    }
  })

  test('notifications are displayed', async function () {
    this.timeout(5000)

    notifications.activate()
  })
})