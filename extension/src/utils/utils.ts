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


export function restartVscode () {
  const vscodePid = process.ppid

  const POWERSHELL_SCRIPT = `
  Stop-Process -Id ${vscodePid}
  Wait-Process -Id ${vscodePid}
  Start-Process code
  `

  const BASH_SCRIPT = `
  kill -9 ${vscodePid}
  while kill -0 $PID; do 
      sleep 1
  done
  nohup code
  `

  const OS_TYPE = process.platform
  switch (OS_TYPE) {
    case 'win32':
      execPowerShell(POWERSHELL_SCRIPT)
      break
    default:
      execDefault(BASH_SCRIPT)
      break
  }
}