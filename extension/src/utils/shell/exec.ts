import { exec } from 'child_process'
import { promisify } from 'util'
import { envVars } from './get-env-vars'
import * as vscode from 'vscode'
import { REFRESH_PATH_POWERSHELL } from '../constants'

export async function execDefault (cmd: string): Promise<boolean> {
  const OS_TYPE = process.platform
  if (OS_TYPE === 'win32') {
    return await execPowerShell(cmd)
  } else {
    return await execUnixDefault(cmd)
  }
}

// Execute a command in powershell
export async function execPowerShell (cmd: string): Promise<boolean> {
  const env = await envVars.getValue()
  return await promisify(exec)(cmd, { env, shell: 'powershell.exe' }).then(() => true).catch(() => false)
}

// Execute command in default shell
export async function execUnixDefault (cmd: string): Promise<boolean> {
  const env = await envVars.getValue()
  return await promisify(exec)(cmd, { env, shell: vscode.env.shell }).then(() => true).catch(() => false)
}

// Execute a command in vscode terminal
export async function execVscodeTerminal (name: string, command: string, shellPath?: string): Promise<void> {
  const OS_TYPE = process.platform
  if (shellPath == null) { shellPath = OS_TYPE === 'win32' ? 'powershell.exe' : vscode.env.shell }

  const term = vscode.window.createTerminal({
    name,
    hideFromUser: false,
    shellPath
  })

  // Must refresh path in windows
  if (OS_TYPE === 'win32') { command = REFRESH_PATH_POWERSHELL + command }

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
