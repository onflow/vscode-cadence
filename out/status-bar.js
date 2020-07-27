"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateActiveAccountStatusBarItem = exports.createActiveAccountStatusBarItem = exports.updateEmulatorStatusBarItem = exports.createEmulatorStatusBarItem = void 0;
const vscode_1 = require("vscode");
const commands_1 = require("./commands");
const extension_1 = require("./extension");
function createEmulatorStatusBarItem() {
    return vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 200);
}
exports.createEmulatorStatusBarItem = createEmulatorStatusBarItem;
function updateEmulatorStatusBarItem(statusBarItem, emulatorState) {
    switch (emulatorState) {
        case extension_1.EmulatorState.Stopped:
            statusBarItem.command = commands_1.START_EMULATOR;
            statusBarItem.text = "$(debug-start) Start Flow Emulator";
            break;
        case extension_1.EmulatorState.Starting:
            statusBarItem.command = undefined;
            statusBarItem.text = "$(loading~spin) Emulator starting...";
            break;
        case extension_1.EmulatorState.Started:
            statusBarItem.command = commands_1.STOP_EMULATOR;
            statusBarItem.text = "$(debug-stop) Stop Flow Emulator";
            break;
    }
    statusBarItem.show();
}
exports.updateEmulatorStatusBarItem = updateEmulatorStatusBarItem;
function createActiveAccountStatusBarItem() {
    const statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 100);
    statusBarItem.command = commands_1.SWITCH_ACCOUNT;
    return statusBarItem;
}
exports.createActiveAccountStatusBarItem = createActiveAccountStatusBarItem;
function updateActiveAccountStatusBarItem(statusBarItem, activeAccount) {
    if (activeAccount == null) {
        statusBarItem.hide();
        return;
    }
    statusBarItem.text = `$(key) Active account: ${activeAccount.fullName()}`;
    statusBarItem.show();
}
exports.updateActiveAccountStatusBarItem = updateActiveAccountStatusBarItem;
//# sourceMappingURL=status-bar.js.map