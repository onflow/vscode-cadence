import * as os from 'os';
import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as child_process from 'child_process';
import { Extension } from "./extension";
import { commands, window, workspace, ExtensionContext, ProgressLocation } from "vscode";
import { rejects } from 'assert';

interface InfoMessage {
  message: string;
}

const UNSUPPORTED_PLATFORM = "Unsupported platform."
const UNSUPPORTED_ARCH = "Unsupported CPU."
const BINARY_ALREADY_INSTALLED = "Binary already installed."
const DOWNLOAD_IN_PROGRESS = "Download in progress."
const USER_CANCELED_DOWNLOAD = "User cancelled download."
const COULD_NOT_GET_LATEST_CADENCE_VERSION = "Error getting the latest Cadence version."
const DOWNLOAD_FAILED = "Download failed."

const DARWIN_FLOW_BIN_PATH = "/usr/local/bin"
const LINUX_FLOW_BIN_PATH = `${process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE}/.local/bin`
const WINDOWS_FLOW_BIN_PATH = ""

const VERSION_TEXT = "/version.txt"

export class FlowInstaller {

  ctx: ExtensionContext;
  platform: string;
  arch: string;
  downloadURL: string;
  targetPath: string;
  downloadDest: string;
  downloads: Map<string, Map<string, Thenable<void>>>
  cadenceVersion: string;

  constructor(ctx: ExtensionContext) {
    const cadenceConfig = workspace.getConfiguration("cadence");
    this.ctx = ctx;
    this.arch = ""
    this.targetPath = ""
    this.downloadDest = ""
    this.platform = process.platform;
    this.downloadURL = cadenceConfig.cliDownloadUrlBase;
    this.downloads = new Map()
    this.cadenceVersion = ""
  }

  async installDepsIfNotPresent() {
    try {
      await this.getLatestCadenceVersion();
      await this.parsePlatform();
      await this.checkForInstalledBin();
      await this.checkForDownloadInProgress();
      await this.startDownload();
    } catch (e) {

      console.log(e)
    }
  }

  private report(message: InfoMessage) {
    console.log('Problem installing Cadence:', message)
  }

  async getLatestCadenceVersion() {
    const getLatestVersion = async (): Promise<string> => {
      return new Promise((res, rej) => {
        https.get(this.downloadURL + VERSION_TEXT, (resp) => {
          let data = '';
          resp.on('data', (chunk) => { data += chunk });
          resp.on('end', () => {
            console.info('Got latest Cadence version:', data)
            res(data)
          });
        }).on("error", rej);
      })
    }
    try {
      const version = await getLatestVersion()
      this.cadenceVersion = version;
    } catch (e) {
      this.report({ message: COULD_NOT_GET_LATEST_CADENCE_VERSION })
    }
  }

  async checkCurrentInstalledCadenceVersion() {

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
        this.report({ message: UNSUPPORTED_PLATFORM })
    }

    switch (["x86_64", "x86-64", "x64", "amd64"].includes(arch)) {
      case true:
        this.arch = "x86_64"
        break;
      default:
        this.report({ message: UNSUPPORTED_ARCH })
    }
    const binaryIdent = `flow-${this.arch}-${this.platform}-${this.cadenceVersion}`
    this.downloadURL = `${this.downloadURL}/${binaryIdent}`
    this.downloadDest = path.join(this.ctx.globalStoragePath, binaryIdent + '.download');
  }

  private executableExists(exe: string): boolean {
    const cmd: string = process.platform === 'win32' ? 'where' : 'which';
    const out = child_process.spawnSync(cmd, [exe]);
    return out.status === 0;
  }

  private async checkForInstalledBin() {
    if (this.executableExists('flow')) {
      try {

      } catch (e) {
        this.report({ message: USER_CANCELED_DOWNLOAD })
      }
    }

    const downloadDest = this.downloadDest;
    if (fs.existsSync(downloadDest)) {
      fs.unlinkSync(downloadDest);
    }
  }

  private async checkForDownloadInProgress() {
    const inFlightDownload = this.downloads.get(this.downloadURL)?.get(this.targetPath);
    if (inFlightDownload) {
      this.report({ message: DOWNLOAD_IN_PROGRESS })
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
          title: `Installing Flow (Cadence ${this.cadenceVersion})`,
          cancellable: false
        }, async (progress) => {
          const download = new Promise<void>((resolve, reject) => {
            console.info('Attempting to download latest version from:', url)
            const { host, path, protocol, port } = url.parse(this.downloadURL);

            const opts: https.RequestOptions = {
              host, path, protocol, port,
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
            await download;
            fs.renameSync(this.downloadDest + '.download', this.targetPath + '/flow');
            this.downloads.get(this.downloadURL)?.delete(this.targetPath);
          } catch (e) {
            this.report({ message: DOWNLOAD_FAILED })
          }
        });
        try {
          if (this.downloads.has(this.downloadURL)) {
            this.downloads.get(this.downloadURL)?.set(this.targetPath, downloadTask);
          } else {
            this.downloads.set(this.downloadURL, new Map([[this.targetPath, downloadTask]]));
          }
          return downloadTask;
        } catch (e) {
          fs.unlinkSync(this.downloadDest);
          this.report({ message: DOWNLOAD_FAILED })
        }
      default:
        this.report({ message: UNSUPPORTED_PLATFORM })
    }
  }

}
