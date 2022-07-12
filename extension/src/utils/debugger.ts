import {
  debug,
  DebugSession,
  DebugAdapterDescriptorFactory,
  DebugAdapterTrackerFactory,
  DebugConfigurationProvider,
  DebugAdapterExecutable,
  DebugAdapterDescriptor,
  DebugAdapterServer,
  OutputChannel,
  window,
  WorkspaceFolder,
  DebugConfiguration,
  CancellationToken,
  ProviderResult,
  ExtensionContext
} from 'vscode'

export class CadenceDebugger {
  constructor (ctx: ExtensionContext) {
    this.registerDebugger(ctx)
  }

  registerDebugger (ctx: ExtensionContext): void {
    const debugOutputChannel = window.createOutputChannel('Cadence Debug')
    ctx.subscriptions.push(debugOutputChannel)

    const provider = new CadenceDebugConfigurationProvider()
    ctx.subscriptions.push(debug.registerDebugConfigurationProvider('flow-emulator', provider))

    const tracker = new CadenceDebugAdapterTrackerFactory(debugOutputChannel)
    ctx.subscriptions.push(debug.registerDebugAdapterTrackerFactory('flow-emulator', tracker))

    const factory = new CadenceDebugAdapterDescriptorFactory(debugOutputChannel)
    ctx.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('flow-emulator', factory))
  }
}

class CadenceDebugAdapterTrackerFactory implements DebugAdapterTrackerFactory {
  constructor (private readonly debugOutputChannel: OutputChannel) {}

  createDebugAdapterTracker (session: DebugSession): {
    onWillReceiveMessage: (m: any) => void
    onDidSendMessage: (m: any) => void} {
    return {
      onWillReceiveMessage: (m: any) =>
        this.debugOutputChannel.appendLine(`>>> ${JSON.stringify(m, undefined, 2)}`),
      onDidSendMessage: (m: any) =>
        this.debugOutputChannel.appendLine(`<<< ${JSON.stringify(m, undefined, 2)}`)
    }
  }
}

class CadenceDebugConfigurationProvider implements DebugConfigurationProvider {
  resolveDebugConfiguration (
    folder: WorkspaceFolder | undefined,
    config: DebugConfiguration,
    token?: CancellationToken
  ): ProviderResult<DebugConfiguration> {
    if (config.program === undefined) {
      const editor = window.activeTextEditor
      if ((editor != null) && editor.document.languageId === 'cadence') {
        config.program = editor.document.getText()
      }
    }

    if (config.program === undefined) {
      void window.showInformationMessage('Cannot find a program to debug')
      return undefined
    }

    return config
  }
}

class CadenceDebugAdapterDescriptorFactory implements DebugAdapterDescriptorFactory {
  constructor (private readonly debugOutputChannel: OutputChannel) {}

  public async createDebugAdapterDescriptor (
    session: DebugSession,
    executable: DebugAdapterExecutable | undefined
  ): Promise<DebugAdapterDescriptor> {
    const { port, host, program } = session.configuration
    // TODO: Fix linting: @typescript-eslint/restrict-template-expressions 
    this.debugOutputChannel.appendLine(`launch: ${host}:${port}:\n${program}`)
    return new DebugAdapterServer(port, host)
  }
}
