import {
    ExtensionContext,
    window,
    Terminal,
    StatusBarItem,
} from "vscode";
import {getConfig, handleConfigChanges, Config} from "./config";
import {LanguageServerAPI} from "./language-server";
import {registerCommands} from "./commands";
import {createTerminal} from "./terminal";
import {
    createEmulatorStatusBarItem, 
    updateEmulatorStatusBarItem,
    createActiveAccountStatusBarItem, 
    updateActiveAccountStatusBarItem, 
} from "./status-bar";

// The container for all data relevant to the extension.
export class Extension {
    config: Config;
    ctx: ExtensionContext;
    api: LanguageServerAPI;
    terminal: Terminal;
    emulatorState: EmulatorState = EmulatorState.Stopped;
    emulatorStatusBarItem: StatusBarItem;
    activeAccountStatusBarItem: StatusBarItem;

    constructor(
        config: Config,
        ctx: ExtensionContext,
        api: LanguageServerAPI,
        terminal: Terminal,
        emulatorStatusBarItem: StatusBarItem,
        activeAccountStatusBarItem: StatusBarItem,
    ) {
        this.config = config;
        this.ctx = ctx;
        this.api = api;
        this.terminal = terminal;
        this.emulatorStatusBarItem = emulatorStatusBarItem;
        this.activeAccountStatusBarItem = activeAccountStatusBarItem;
    }

    getEmulatorState(): EmulatorState {
        return this.emulatorState;
    }

    setEmulatorState(state: EmulatorState) {
        this.emulatorState = state;
    }
};

export enum EmulatorState {
    Stopped = 1,
    Starting,
    Started,
}

// Called when the extension starts up. Reads config, starts the language
// server, and registers command handlers.
export function activate(ctx: ExtensionContext) {
    let config: Config;
    let terminal: Terminal;
    let api: LanguageServerAPI;

    try {
        config = getConfig();
        terminal = createTerminal(ctx);
        api = new LanguageServerAPI(ctx, config);
    } catch (err) {
        window.showErrorMessage("Failed to activate extension: ", err);
        return;
    }
    handleConfigChanges();

    const ext = new Extension(
        config,
        ctx,
        api,
        terminal,
        createEmulatorStatusBarItem(),
        createActiveAccountStatusBarItem(),
    )

    registerCommands(ext);
    renderExtension(ext);
}

export function deactivate() {}

export function renderExtension(ext: Extension) {
    updateEmulatorStatusBarItem(ext.emulatorStatusBarItem, ext.getEmulatorState());
    updateActiveAccountStatusBarItem(ext.activeAccountStatusBarItem, ext.config.getActiveAccount());
}
