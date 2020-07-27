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
exports.FlowInstaller = void 0;
const os = require("os");
const fs = require("fs");
const path = require("path");
const https = require("https");
const url = require("url");
const child_process = require("child_process");
const vscode_1 = require("vscode");
const UNSUPPORTED_PLATFORM = "Unsupported platform.";
const UNSUPPORTED_ARCH = "Unsupported CPU.";
const BINARY_ALREADY_INSTALLED = "Binary already installed.";
const DOWNLOAD_IN_PROGRESS = "Download in progress.";
const DOWNLOAD_FAILED = "Download failed.";
const DARWIN_FLOW_BIN_PATH = "/usr/local/bin";
const LINUX_FLOW_BIN_PATH = `${process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE}/.local/bin`;
const WINDOWS_FLOW_BIN_PATH = "";
function executableExists(exe) {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const out = child_process.spawnSync(cmd, [exe]);
    return out.status === 0;
}
class FlowInstaller {
    constructor(ctx) {
        const cadenceConfig = vscode_1.workspace.getConfiguration("cadence");
        this.ctx = ctx;
        this.arch = "";
        this.targetPath = "";
        this.downloadDest = "";
        this.platform = process.platform;
        this.downloadURL = cadenceConfig.cliDownloadUrlBase;
        this.inFlightDownloads = new Map();
        this.cadenceVersion = "v0.6.0"; // TODO: make this dynamic
    }
    installDepsIfNotPresent() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.parsePlatform();
                yield this.checkForInstalledBin();
                yield this.checkForDownloadInProgress();
                yield this.startDownload();
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    parsePlatform() {
        const arch = os.arch();
        switch (this.platform) {
            case "win32":
                this.targetPath = DARWIN_FLOW_BIN_PATH;
            case "darwin":
                this.targetPath = DARWIN_FLOW_BIN_PATH;
                break;
            case "linux":
                this.targetPath = LINUX_FLOW_BIN_PATH;
                break;
            default:
                throw { message: UNSUPPORTED_PLATFORM };
        }
        switch (["x86_64", "x86-64", "x64", "amd64"].includes(arch)) {
            case true:
                this.arch = "x86_64";
                break;
            default:
                throw { message: UNSUPPORTED_ARCH };
        }
        const binaryIdent = `flow-${this.arch}-${this.platform}-${this.cadenceVersion}`;
        this.downloadURL = `${this.downloadURL}/${binaryIdent}`;
        this.downloadDest = path.join(this.ctx.globalStoragePath, binaryIdent + '.download');
    }
    checkForInstalledBin() {
        return __awaiter(this, void 0, void 0, function* () {
            if (executableExists('flow')) {
                throw { message: BINARY_ALREADY_INSTALLED };
            }
            const downloadDest = this.downloadDest;
            if (fs.existsSync(downloadDest)) {
                fs.unlinkSync(downloadDest);
            }
        });
    }
    checkForDownloadInProgress() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const inFlightDownload = (_a = this.inFlightDownloads.get(this.downloadURL)) === null || _a === void 0 ? void 0 : _a.get(this.targetPath);
            if (inFlightDownload) {
                throw { message: DOWNLOAD_IN_PROGRESS };
            }
        });
    }
    startDownload() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.platform) {
                case "win32":
                // TODO
                case "darwin":
                case "linux":
                    if (fs.existsSync(this.downloadDest)) {
                        fs.unlinkSync(this.downloadDest);
                    }
                    const downloadTask = vscode_1.window.withProgress({
                        location: vscode_1.ProgressLocation.Notification,
                        title: "Installing Flow on your system!",
                        cancellable: false
                    }, (progress) => __awaiter(this, void 0, void 0, function* () {
                        var _b;
                        const p = new Promise((resolve, reject) => {
                            const { host, path, protocol, port } = url.parse(this.downloadURL);
                            const opts = {
                                host, path, protocol, port,
                                headers: { 'User-Agent': 'vscode-cadence-ext' },
                            };
                            https.get(opts, (res) => {
                                const totalSize = parseInt(res.headers['content-length'] || '1', 10);
                                const fileStream = fs.createWriteStream(this.downloadDest + '.download', { mode: 0o711 });
                                let curSize = 0;
                                function toMB(bytes) {
                                    return bytes / (1024 * 1024);
                                }
                                res.pipe(fileStream);
                                res.on('data', (chunk) => {
                                    curSize += chunk.byteLength;
                                    const msg = `${toMB(curSize).toFixed(1)}MB / ${toMB(totalSize).toFixed(1)}MB`;
                                    progress.report({ message: msg, increment: (chunk.length / totalSize) * 100 });
                                });
                                res.on('error', reject);
                                fileStream.on('close', resolve);
                            }).on('error', reject);
                        });
                        try {
                            yield p;
                            fs.renameSync(this.downloadDest + '.download', this.targetPath + '/flow');
                        }
                        finally {
                            (_b = this.inFlightDownloads.get(this.downloadURL)) === null || _b === void 0 ? void 0 : _b.delete(this.targetPath);
                        }
                    }));
                    try {
                        if (this.inFlightDownloads.has(this.downloadURL)) {
                            (_a = this.inFlightDownloads.get(this.downloadURL)) === null || _a === void 0 ? void 0 : _a.set(this.targetPath, downloadTask);
                        }
                        else {
                            this.inFlightDownloads.set(this.downloadURL, new Map([[this.targetPath, downloadTask]]));
                        }
                        return downloadTask;
                    }
                    catch (e) {
                        fs.unlinkSync(this.downloadDest);
                        throw new Error(`Failed to download ${url}`);
                    }
                default:
                    throw { message: UNSUPPORTED_PLATFORM };
            }
        });
    }
    parseThrownMessage(message) {
        // TODO window.show info / show error
        return message !== null && message !== void 0 ? message : "ERROR";
    }
    confirmDownload() {
        return this;
    }
}
exports.FlowInstaller = FlowInstaller;
//# sourceMappingURL=flow-installer.js.map