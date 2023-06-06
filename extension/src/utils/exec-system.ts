import { exec } from 'child_process'
import { promisify } from 'util'

// Execute a command in powershell; returns false on error
export async function execPowerShell (cmd: string): Promise<{ stdout: string, stderr: string }> {
  return await promisify(exec)(cmd, { shell: 'powershell.exe' })
}

// Execute command in default shell; returns false on error
export async function execDefault (cmd: string): Promise<{ stdout: string, stderr: string }> {
  return await promisify(exec)(cmd)
}
