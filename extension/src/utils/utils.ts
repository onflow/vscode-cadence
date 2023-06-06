import { execDefault, execPowerShell } from './exec-system'
import { REFRESH_PATH_POWERSHELL } from './constants'

// Check if a promise was resolved or rejected
export async function didResolve (promise: Promise<any>): Promise<boolean> {
  try {
    await promise
    return true
  } catch (e) {
    return false
  }
}

export async function delay (seconds: number): Promise<void> {
  await new Promise((resolve, reject) => {
    setTimeout(() => resolve(''), seconds * 1000)
  })
}

export async function restartVscode (): Promise<void> {
  const vscodePid = process.ppid

  const POWERSHELL_SCRIPT = `
  Stop-Process -Id ${vscodePid}
  Wait-Process -Id ${vscodePid}
  ${REFRESH_PATH_POWERSHELL}
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
      await execPowerShell(POWERSHELL_SCRIPT)
      break
    default:
      await execDefault(BASH_SCRIPT)
      break
  }
}
