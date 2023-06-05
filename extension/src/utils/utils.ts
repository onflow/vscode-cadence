import { PromiseWithChild, exec } from 'child_process'
import { promisify} from 'util'
import { window } from 'vscode'

export const FILE_PATH_EMPTY = ''

const REFRESH_PATH_POWERSHELL = '$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User");'

// Check if a promise was resolved or rejected
export async function didResolve(promise: Promise<any>): Promise<boolean> {
  try {
    await promise
    return true
  } catch (e) {
    return false
  }
}

// Execute a command in vscode terminal
export async function execVscodeTerminal (name: string, command: string, shellPath?: string): Promise<void> {
  const OS_TYPE = process.platform
  shellPath = shellPath || (OS_TYPE ? 'powershell.exe' : '/bin/bash')

  const term = window.createTerminal({
    name: name,
    hideFromUser: false,
    shellPath
  })

  // Must refresh path in windows
  if(OS_TYPE === 'win32')
    command = REFRESH_PATH_POWERSHELL + command

  // Add exit to command to close terminal
  command = OS_TYPE === 'win32' ? command + '; exit $LASTEXITCODE' : command + '; exit $?'

  term.sendText(command)
  term.show()

  // Wait for installation to complete
  await new Promise<void>((resolve, reject) => {
    const disposeToken = window.onDidCloseTerminal(
      async (closedTerminal) => {
        if (closedTerminal === term) {
          disposeToken.dispose();
          if (term.exitStatus?.code === 0) {
            resolve();
          } else {
            reject("Terminal execution failed");
          }
        }
      }
    );
  });
}

// Execute a command in powershell; returns false on error
export function execPowerShell (cmd: string): PromiseWithChild<{ stdout: string; stderr: string }> {
  return promisify(exec)(cmd, { shell: 'powershell.exe' })
}

// Execute command in default shell; returns false on error
export function execDefault (cmd: string): PromiseWithChild<{ stdout: string; stderr: string }> {
  return promisify(exec)(cmd)
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
  ${REFRESH_PATH_POWERSHELL.slice(0, -2)}
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