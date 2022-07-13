/* Classes required to implement a vscode debugger */
import {
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
  ProviderResult
} from 'vscode'

export class CadenceDebugAdapterTrackerFactory implements DebugAdapterTrackerFactory {
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

export class CadenceDebugConfigurationProvider implements DebugConfigurationProvider {
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

export class CadenceDebugAdapterDescriptorFactory implements DebugAdapterDescriptorFactory {
  constructor (private readonly debugOutputChannel: OutputChannel) {}

  public async createDebugAdapterDescriptor (
    session: DebugSession,
    executable: DebugAdapterExecutable | undefined
  ): Promise<DebugAdapterDescriptor> {
    const { port, host, program } = session.configuration
    this.debugOutputChannel.appendLine(`launch: ${host as string}:${port as string}:\n${program as string}`)
    return new DebugAdapterServer(port, host)
  }
}
