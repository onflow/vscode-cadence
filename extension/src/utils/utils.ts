import { execSync } from 'child_process'

export const FILE_PATH_EMPTY = ''

// Execute a command in powershell; returns false on error
export function execPowerShell (cmd: string): boolean {
  try {
    execSync(cmd, { shell: 'powershell.exe' })
  } catch (err) {
    return false
  }
  return true
}

// Execute command in default shell; returns false on error
export function execDefault (cmd: string): boolean {
  try {
    execSync(cmd)
  } catch (err) {
    return false
  }
  return true
}

export async function delay (seconds: number): Promise<void> {
  await new Promise((resolve, reject) => {
    setTimeout(() => resolve(''), seconds * 1000)
  })
}
