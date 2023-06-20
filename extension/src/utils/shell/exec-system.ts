import { exec } from 'child_process'
import { promisify } from 'util'
import * as vscode from 'vscode'
import { envVars } from './refresh-env'

// Execute a command in powershell
export async function execPowerShell (cmd: string): Promise<{ stdout: string, stderr: string }> {
  const env = await envVars.getValue()
  return await promisify(exec)(cmd, { shell: 'powershell.exe' })
}

// Execute command in default shell
export async function execUnixDefault (cmd: string): Promise<{ stdout: string, stderr: string }> {  
  const env = await envVars.getValue()
  return promisify(exec)(cmd, { env, shell: vscode.env.shell })
}