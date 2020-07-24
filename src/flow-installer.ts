import * as os from 'os';
import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as child_process from 'child_process';
import { Extension } from "./extension";
import { commands, window, workspace, ExtensionContext, ProgressLocation } from "vscode";

interface InfoMessage {
  message: string;
}

const UNSUPPORTED_PLATFORM = "Unsupported platform."
const UNSUPPORTED_ARCH = "Unsupported CPU."
const BINARY_ALREADY_INSTALLED = "Binary already installed."
const DOWNLOAD_IN_PROGRESS = "Download in progress."
const DOWNLOAD_FAILED = "Download failed."

const DARWIN_FLOW_BIN_PATH = "/usr/local/bin"
const LINUX_FLOW_BIN_PATH = `${process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE}/.local/bin`
const WINDOWS_FLOW_BIN_PATH = ""

function executableExists(exe: string): boolean {
  const cmd: string = process.platform === 'win32' ? 'where' : 'which';
  const out = child_process.spawnSync(cmd, [exe]);
  return out.status === 0;
}

export class FlowInstaller {

  ctx: ExtensionContext;
  platform: string;
  arch: string;
  downloadURL: string;
  targetPath: string;
  downloadDest: string;
  inFlightDownloads: Map<string, Map<string, Thenable<void>>>
  cadenceVersion: string;

  constructor(ctx: ExtensionContext) {
    const cadenceConfig = workspace.getConfiguration("cadence");
    this.ctx = ctx;
    this.arch = ""
    this.targetPath = ""
    this.downloadDest = ""
    this.platform = process.platform;
    this.downloadURL = cadenceConfig.cliDownloadUrlBase;
    this.inFlightDownloads = new Map()
    this.cadenceVersion = "v0.6.0" // TODO: make this dynamic
  }

  async installDepsIfNotPresent() {
    try {
      await this.parsePlatform();
      await this.checkForInstalledBin();
      await this.checkForDownloadInProgress();
      await this.startDownload();
    } catch (e) {
      console.log(e)
    }
  }

  private parsePlatform() {
    const arch = os.arch()
    switch (this.platform) {
      case "win32":
        this.targetPath = DARWIN_FLOW_BIN_PATH
      case "darwin":
        this.targetPath = DARWIN_FLOW_BIN_PATH
        break;
      case "linux":
        this.targetPath = LINUX_FLOW_BIN_PATH
        break;
      default:
        throw <InfoMessage>{ message: UNSUPPORTED_PLATFORM }
    }

    switch (["x86_64", "x86-64", "x64", "amd64"].includes(arch)) {
      case true:
        this.arch = "x86_64"
        break;
      default:
        throw <InfoMessage>{ message: UNSUPPORTED_ARCH }
    }
    const binaryIdent = `flow-${this.arch}-${this.platform}-${this.cadenceVersion}`
    this.downloadURL = `${this.downloadURL}/${binaryIdent}`
    this.downloadDest = path.join(this.ctx.globalStoragePath, binaryIdent + '.download');
  }



  private async checkForInstalledBin() {
    if (executableExists('flow')) {
      throw <InfoMessage>{ message: BINARY_ALREADY_INSTALLED }
    }
    const downloadDest = this.downloadDest;
    if (fs.existsSync(downloadDest)) {
      fs.unlinkSync(downloadDest);
    }
  }

  private async checkForDownloadInProgress() {
    const inFlightDownload = this.inFlightDownloads.get(this.downloadURL)?.get(this.targetPath);
    if (inFlightDownload) {
      throw <InfoMessage>{ message: DOWNLOAD_IN_PROGRESS }
    }
  }

  private async startDownload() {
    switch (this.platform) {
      case "win32":
      // TODO
      case "darwin":
      case "linux":
        const downloadTask = window.withProgress({
          location: ProgressLocation.Notification,
          title: "Installing Flow on your system!",
          cancellable: false
        }, async (progress) => {
          const p = new Promise<void>((resolve, reject) => {

            const srcUrl = url.parse(this.downloadURL);

            const opts: https.RequestOptions = {
              host: srcUrl.host,
              path: srcUrl.path,
              protocol: srcUrl.protocol,
              port: srcUrl.port,
              headers: { 'User-Agent': 'vscode-cadence-ext' },
            };

            https.get(opts, (res) => {
              const totalSize = parseInt(res.headers['content-length'] || '1', 10);
              const fileStream = fs.createWriteStream(this.downloadDest + '.download', { mode: 0o711 });
              let curSize = 0;

              function toMB(bytes: number) {
                return bytes / (1024 * 1024);
              }

              res.pipe(fileStream);

              res.on('data', (chunk: Buffer) => {
                curSize += chunk.byteLength;
                const msg = `${toMB(curSize).toFixed(1)}MB / ${toMB(totalSize).toFixed(1)}MB`;
                progress.report({ message: msg, increment: (chunk.length / totalSize) * 100 });
              });

              res.on('error', reject);

              fileStream.on('close', resolve);
            }).on('error', reject)
          });

          try {
            await p;
            fs.renameSync(this.downloadDest + '.download', this.targetPath + '/flow');
          } finally {
            this.inFlightDownloads.get(this.downloadURL)?.delete(this.targetPath);
          }
        });
        try {
          if (this.inFlightDownloads.has(this.downloadURL)) {
            this.inFlightDownloads.get(this.downloadURL)?.set(this.targetPath, downloadTask);
          } else {
            this.inFlightDownloads.set(this.downloadURL, new Map([[this.targetPath, downloadTask]]));
          }
          return downloadTask;
        } catch (e) {
          fs.unlinkSync(this.downloadDest);
          throw new Error(`Failed to download ${url}`);
        }
      default:
        throw <InfoMessage>{ message: UNSUPPORTED_PLATFORM }
    }
  }

  private parseThrownMessage(message: Error | InfoMessage) {
    // TODO window.show info / show error
    return message ?? "ERROR";
  }

  private confirmDownload() {
    return this;
  }
}
