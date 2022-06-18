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

    constructor(private debugOutputChannel: OutputChannel) {}

    createDebugAdapterTracker(session: DebugSession) {
        return {
            onWillReceiveMessage: (m: any) =>
                this.debugOutputChannel.appendLine(`>>> ${JSON.stringify(m, undefined, 2)}`),
            onDidSendMessage: (m: any) =>
                this.debugOutputChannel.appendLine(`<<< ${JSON.stringify(m, undefined, 2)}`)
        }
    }
}

export class CadenceDebugConfigurationProvider implements DebugConfigurationProvider {

	resolveDebugConfiguration(
        folder: WorkspaceFolder | undefined,
        config: DebugConfiguration,
        token?: CancellationToken
    ): ProviderResult<DebugConfiguration> {

		if (!config.program) {
			const editor = window.activeTextEditor;
			if (editor && editor.document.languageId === 'cadence') {
				config.program = editor.document.getText()
			}
		}

		if (!config.program) {
			return window.showInformationMessage("Cannot find a program to debug").then(_ => {
				return undefined
			})
		}

		return config
	}
}

export class CadenceDebugAdapterDescriptorFactory implements DebugAdapterDescriptorFactory {

    constructor(private debugOutputChannel: OutputChannel) {}

	public async createDebugAdapterDescriptor(
		session: DebugSession,
		executable: DebugAdapterExecutable | undefined
	): Promise<DebugAdapterDescriptor> {
        const {port, host, program} = session.configuration
        this.debugOutputChannel.appendLine(`launch: ${host}:${port}:\n${program}`)
		return new DebugAdapterServer(port, host)
	}
}
