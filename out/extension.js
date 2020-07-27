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
exports.ensureRuntimeDependencies = exports.renderExtension = exports.deactivate = exports.activate = exports.EmulatorState = exports.Extension = void 0;
const vscode_1 = require("vscode");
const flow_installer_1 = require("./flow-installer");
const config_1 = require("./config");
const language_server_1 = require("./language-server");
const commands_1 = require("./commands");
const terminal_1 = require("./terminal");
const status_bar_1 = require("./status-bar");
// The container for all data relevant to the extension.
class Extension {
    constructor(config, ctx, api, terminal, emulatorStatusBarItem, activeAccountStatusBarItem) {
        this.emulatorState = EmulatorState.Stopped;
        this.config = config;
        this.ctx = ctx;
        this.api = api;
        this.terminal = terminal;
        this.emulatorStatusBarItem = emulatorStatusBarItem;
        this.activeAccountStatusBarItem = activeAccountStatusBarItem;
    }
    getEmulatorState() {
        return this.emulatorState;
    }
    setEmulatorState(state) {
        this.emulatorState = state;
    }
}
exports.Extension = Extension;
;
var EmulatorState;
(function (EmulatorState) {
    EmulatorState[EmulatorState["Stopped"] = 1] = "Stopped";
    EmulatorState[EmulatorState["Starting"] = 2] = "Starting";
    EmulatorState[EmulatorState["Started"] = 3] = "Started";
})(EmulatorState = exports.EmulatorState || (exports.EmulatorState = {}));
// Called when the extension starts up. Reads config, starts the language
// server, and registers command handlers.
function activate(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        let config;
        let terminal;
        let api;
        try {
            config = config_1.getConfig();
            terminal = terminal_1.createTerminal(ctx);
            api = new language_server_1.LanguageServerAPI(ctx, config);
        }
        catch (err) {
            vscode_1.window.showErrorMessage("Failed to activate extension: ", err);
            return;
        }
        config_1.handleConfigChanges();
        const ext = new Extension(config, ctx, api, terminal, status_bar_1.createEmulatorStatusBarItem(), status_bar_1.createActiveAccountStatusBarItem());
        commands_1.registerCommands(ext);
        renderExtension(ext);
    });
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
function renderExtension(ext) {
    status_bar_1.updateEmulatorStatusBarItem(ext.emulatorStatusBarItem, ext.getEmulatorState());
    status_bar_1.updateActiveAccountStatusBarItem(ext.activeAccountStatusBarItem, ext.config.getActiveAccount());
}
exports.renderExtension = renderExtension;
function ensureRuntimeDependencies(ext) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new flow_installer_1.FlowInstaller(ext.ctx).installDepsIfNotPresent();
    });
}
exports.ensureRuntimeDependencies = ensureRuntimeDependencies;
//# sourceMappingURL=extension.js.map