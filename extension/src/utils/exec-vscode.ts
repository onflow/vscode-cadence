import { REFRESH_PATH_POWERSHELL } from './constants'
import { window } from 'vscode'

// Execute a command in vscode terminal
export async function execVscodeTerminal (name: string, command: string, shellPath?: string): Promise<void> {
  const OS_TYPE = process.platform
  if (shellPath == null) { shellPath = OS_TYPE === 'win32' ? 'powershell.exe' : '/bin/bash' }

  const term = window.createTerminal({
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
    const disposeToken = window.onDidCloseTerminal(
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
