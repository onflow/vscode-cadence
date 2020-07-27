"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = exports.SWITCH_ACCOUNT_SERVER = exports.CREATE_DEFAULT_ACCOUNTS_SERVER = exports.CREATE_ACCOUNT_SERVER = exports.SWITCH_ACCOUNT = exports.CREATE_ACCOUNT = exports.STOP_EMULATOR = exports.START_EMULATOR = exports.RESTART_SERVER = void 0;
const vscode_1 = require("vscode");
const extension_1 = require("./extension");
const language_server_1 = require("./language-server");
const terminal_1 = require("./terminal");
const address_1 = require("./address");
// Command identifiers for locally handled commands
exports.RESTART_SERVER = "cadence.restartServer";
exports.START_EMULATOR = "cadence.runEmulator";
exports.STOP_EMULATOR = "cadence.stopEmulator";
exports.CREATE_ACCOUNT = "cadence.createAccount";
exports.SWITCH_ACCOUNT = "cadence.switchActiveAccount";
// Command identifies for commands handled by the Language server
exports.CREATE_ACCOUNT_SERVER = "cadence.server.flow.createAccount";
exports.CREATE_DEFAULT_ACCOUNTS_SERVER = "cadence.server.flow.createDefaultAccounts";
exports.SWITCH_ACCOUNT_SERVER = "cadence.server.flow.switchActiveAccount";
// Registers a command with VS Code so it can be invoked by the user.
function registerCommand(ctx, command, callback) {
    ctx.subscriptions.push(vscode_1.commands.registerCommand(command, callback));
}
// Registers all commands that are handled by the extension (as opposed to
// those handled by the Language Server).
function registerCommands(ext) {
    registerCommand(ext.ctx, exports.RESTART_SERVER, restartServer(ext));
    registerCommand(ext.ctx, exports.START_EMULATOR, startEmulator(ext));
    registerCommand(ext.ctx, exports.STOP_EMULATOR, stopEmulator(ext));
    registerCommand(ext.ctx, exports.CREATE_ACCOUNT, createAccount(ext));
    registerCommand(ext.ctx, exports.SWITCH_ACCOUNT, switchActiveAccount(ext));
}
exports.registerCommands = registerCommands;
// Restarts the language server, updating the client in the extension object.
const restartServer = (ext) => () => __awaiter(void 0, void 0, void 0, function* () {
    yield ext.api.client.stop();
    ext.api = new language_server_1.LanguageServerAPI(ext.ctx, ext.config);
});
// Starts the emulator in a terminal window.
const startEmulator = (ext) => () => __awaiter(void 0, void 0, void 0, function* () {
    // Start the emulator with the service key we gave to the language server.
    const { serverConfig } = ext.config;
    yield extension_1.ensureRuntimeDependencies(ext);
    ext.setEmulatorState(extension_1.EmulatorState.Starting);
    extension_1.renderExtension(ext);
    ext.terminal.sendText([
        ext.config.flowCommand,
        `emulator`,
        `start`,
        `--init`,
        `--verbose`,
        `--service-priv-key`,
        serverConfig.servicePrivateKey,
        `--service-sig-algo`,
        serverConfig.serviceKeySignatureAlgorithm,
        `--service-hash-algo`,
        serverConfig.serviceKeyHashAlgorithm,
    ].join(" "));
    ext.terminal.show();
    ext.setEmulatorState(extension_1.EmulatorState.Started);
    // create default accounts after the emulator has started
    setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const accounts = yield ext.api.createDefaultAccounts(ext.config.numAccounts);
            accounts.forEach((address) => ext.config.addAccount(address));
            const activeAccount = ext.config.getAccount(0);
            if (!activeAccount) {
                console.error("Failed to get initial active account");
                return;
            }
            setActiveAccount(ext, activeAccount);
            extension_1.renderExtension(ext);
        }
        catch (err) {
            ext.setEmulatorState(extension_1.EmulatorState.Stopped);
            extension_1.renderExtension(ext);
            console.error("Failed to create default accounts", err);
            vscode_1.window.showWarningMessage("Failed to create default accounts");
        }
    }), 3000);
});
// Stops emulator, exits the terminal, and removes all config/db files.
const stopEmulator = (ext) => () => __awaiter(void 0, void 0, void 0, function* () {
    ext.terminal.dispose();
    ext.terminal = terminal_1.createTerminal(ext.ctx);
    ext.setEmulatorState(extension_1.EmulatorState.Stopped);
    // Clear accounts and restart language server to ensure account
    // state is in sync.
    ext.config.resetAccounts();
    extension_1.renderExtension(ext);
    yield ext.api.client.stop();
    ext.api = new language_server_1.LanguageServerAPI(ext.ctx, ext.config);
});
// Creates a new account by requesting that the Language Server submit
// a "create account" transaction from the currently active account.
const createAccount = (ext) => () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const addr = yield ext.api.createAccount();
        ext.config.addAccount(addr);
        extension_1.renderExtension(ext);
    }
    catch (err) {
        vscode_1.window.showErrorMessage("Failed to create account: " + err);
        return;
    }
});
// Switches the active account to the option selected by the user. The selection
// is propagated to the Language Server.
const switchActiveAccount = (ext) => () => __awaiter(void 0, void 0, void 0, function* () {
    // Suffix to indicate which account is active
    const activeSuffix = "(active)";
    // Create the options (mark the active account with an 'active' prefix)
    const accountOptions = Object.values(ext.config.accounts)
        // Mark the active account with a `*` in the dialog
        .map((account) => {
        const suffix = account.index === ext.config.activeAccount ? ` ${activeSuffix}` : "";
        const label = account.fullName() + suffix;
        return {
            label: label,
            target: account.index,
        };
    });
    vscode_1.window.showQuickPick(accountOptions).then((selected) => {
        // `selected` is undefined if the QuickPick is dismissed, and the
        // string value of the selected option otherwise.
        if (selected === undefined) {
            return;
        }
        const activeIndex = selected.target;
        const activeAccount = ext.config.getAccount(activeIndex);
        if (!activeAccount) {
            console.error("Switched to invalid account");
            return;
        }
        setActiveAccount(ext, activeAccount);
        vscode_1.window.showInformationMessage(`Switched to account ${activeAccount.fullName()}`);
        extension_1.renderExtension(ext);
    });
});
const setActiveAccount = (ext, activeAccount) => {
    try {
        ext.api.switchActiveAccount(address_1.removeAddressPrefix(activeAccount.address));
        vscode_1.window.visibleTextEditors.forEach((editor) => {
            if (!editor.document.lineCount) {
                return;
            }
            // NOTE: We add a space to the end of the last line to force
            // Codelens to refresh.
            const lineCount = editor.document.lineCount;
            const lastLine = editor.document.lineAt(lineCount - 1);
            editor.edit((edit) => {
                if (lastLine.isEmptyOrWhitespace) {
                    edit.insert(new vscode_1.Position(lineCount - 1, 0), " ");
                    edit.delete(new vscode_1.Range(lineCount - 1, 0, lineCount - 1, 1000));
                }
                else {
                    edit.insert(new vscode_1.Position(lineCount - 1, 1000), "\n");
                }
            });
        });
    }
    catch (err) {
        vscode_1.window.showWarningMessage("Failed to switch active account");
        console.error(err);
        return;
    }
    ext.config.setActiveAccount(activeAccount.index);
};
//# sourceMappingURL=commands.js.map