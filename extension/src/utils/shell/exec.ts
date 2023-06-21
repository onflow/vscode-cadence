import { ExecOptions, exec } from 'child_process'
import { promisify } from 'util'
import { envVars } from './env-vars'
import * as vscode from 'vscode'

export async function execDefault (cmd: string, options: ExecOptions = {}): Promise<boolean> {
  const OS_TYPE = process.platform
  if (OS_TYPE === 'win32') {
    return await execPowerShell(cmd, options)
  } else {
    return await execUnixDefault(cmd, options)
  }
}

// Execute a command in powershell
export async function execPowerShell (cmd: string, options: ExecOptions = {}): Promise<boolean> {
  const env = await envVars.getValue()
  return await promisify(exec)(cmd, { env, shell: 'powershell.exe', ...options }).then(() => true).catch(() => false)
}

// Execute command in default shell
export async function execUnixDefault (cmd: string, options: ExecOptions = {}): Promise<boolean> {
  const env = await envVars.getValue()
  return await promisify(exec)(cmd, { env, shell: vscode.env.shell, ...options }).then(() => true).catch(() => false)
}

// Execute a command in vscode terminal
export async function execVscodeTerminal (name: string, command: string, shellPath?: string): Promise<void> {
  const OS_TYPE = process.platform
  if (shellPath == null) { shellPath = OS_TYPE === 'win32' ? 'powershell.exe' : vscode.env.shell }

  const term = vscode.window.createTerminal({
    name,
    hideFromUser: false,
    shellPath,
    env: await envVars.getValue()
  })

  // Add exit to command to close terminal
  command = OS_TYPE === 'win32' ? command + '; exit $LASTEXITCODE' : command + '; exit $?'

  term.sendText(command)
  term.show()

  // Wait for installation to complete
  await new Promise<void>((resolve, reject) => {
    const disposeToken = vscode.window.onDidCloseTerminal(
      async (closedTerminal) => {
        if (closedTerminal === term) {
          disposeToken.dispose()
          if (term.exitStatus?.code === 0) {
            resolve()
          } else {
            reject(new Error('Terminal execution failed'))
          }
        }
      }
    )
  })
}
