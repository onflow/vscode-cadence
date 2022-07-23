/* Cadence debugger */
import {
  debug,
  ExtensionContext,
  window
} from 'vscode'
import { Disposable } from 'vscode-languageclient'
import {
  CadenceDebugConfigurationProvider,
  CadenceDebugAdapterTrackerFactory,
  CadenceDebugAdapterDescriptorFactory
} from './debug-adapters'

export class CadenceDebugger {
  debugAdapters: Disposable[] // Hold onto adapters

  constructor (ctx: ExtensionContext) {
    this.debugAdapters = []
    this.#registerDebugger(ctx)
  }

  #registerDebugger (ctx: ExtensionContext): void {
    const debugOutputChannel = window.createOutputChannel('Cadence Debug')
    this.debugAdapters.push(debugOutputChannel) // TODO: can we subscribe there, or do we need to hold onto them?
    // ctx.subscriptions.push(debugOutputChannel)

    const provider = new CadenceDebugConfigurationProvider()
    this.debugAdapters.push(debug.registerDebugConfigurationProvider('flow-emulator', provider))
    // ctx.subscriptions.push(debug.registerDebugConfigurationProvider('flow-emulator', provider))

    const tracker = new CadenceDebugAdapterTrackerFactory(debugOutputChannel)
    this.debugAdapters.push(debug.registerDebugAdapterTrackerFactory('flow-emulator', tracker))

    // ctx.subscriptions.push(debug.registerDebugAdapterTrackerFactory('flow-emulator', tracker))

    const factory = new CadenceDebugAdapterDescriptorFactory(debugOutputChannel)
    this.debugAdapters.push(debug.registerDebugAdapterDescriptorFactory('flow-emulator', factory))
    // ctx.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('flow-emulator', factory))
  }
}
