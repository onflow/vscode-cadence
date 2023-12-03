import { ExecOptions, SpawnOptionsWithoutStdio, exec, spawn } from 'child_process'
import { envVars } from './env-vars'
import * as vscode from 'vscode'
import { getDefaultShell } from './default-shell'

type ExecResult = {
  stdout: string
  stderr: string
  code: number | null
}

// Execute a command in default shell
export async function execDefault (cmd: string, args?: readonly string[] | undefined, options?: SpawnOptionsWithoutStdio | undefined, cancellationToken?: vscode.CancellationToken): Promise<ExecResult> {
  const OS_TYPE = process.platform
  if (OS_TYPE === 'win32') {
    return await execPowerShell(cmd, args, options, cancellationToken)
  } else {
    return await execUnixDefault(cmd, args, options, cancellationToken)
  }
}

// Execute a command in powershell
export async function execPowerShell (cmd: string, args?: readonly string[] | undefined, options?: SpawnOptionsWithoutStdio | undefined, cancellationToken?: vscode.CancellationToken): Promise<ExecResult> {
  const env = await envVars.getValue()
  return await abortableExec(cmd, args, { env, shell: 'powershell.exe', ...options }, cancellationToken)
}

// Execute command in default shell
export async function execUnixDefault (cmd: string, args?: readonly string[] | undefined, options?: SpawnOptionsWithoutStdio | undefined, cancellationToken?: vscode.CancellationToken): Promise<ExecResult> {
  const env = await envVars.getValue()
  return await abortableExec(cmd, args, { env, shell: getDefaultShell(), ...options }, cancellationToken)
}

async function abortableExec(cmd: string, args?: readonly string[] | undefined, options?: SpawnOptionsWithoutStdio | undefined, cancellationToken?: vscode.CancellationToken): Promise<ExecResult> {
  let cancellationHandler: vscode.Disposable | undefined
  return await new Promise<ExecResult>((resolve, reject) => {
    cancellationHandler = cancellationToken?.onCancellationRequested(() => {
      child_process.kill()
      reject(new Error('Command execution cancelled'))
    })

    const child_process = spawn(cmd, args, { ...options })
    let stdout = ''
    let stderr = ''

    child_process.stdout.on('data', (data) => {
      stdout += data
    })

    child_process.stderr.on('data', (data) => {
      stderr += data
    })

    child_process.on('error', (err) => {
      reject(err)
    })

    child_process.on('close', (code) => {
      resolve({ stdout, stderr, code })
    })
  }).finally(() => {
    cancellationHandler?.dispose()
  })
}

export async function tryExecDefault (cmd: string, args?: readonly string[] | undefined, options?: SpawnOptionsWithoutStdio | undefined, cancellationToken?: vscode.CancellationToken): Promise<boolean> {
  return await execDefault(cmd, args, options, cancellationToken).then(({ code }) => code === 0).catch(() => false)
}

export async function tryExecPowerShell (cmd: string, args?: readonly string[] | undefined, options?: SpawnOptionsWithoutStdio | undefined, cancellationToken?: vscode.CancellationToken): Promise<boolean> {
  return await execPowerShell(cmd, args, options, cancellationToken).then(({ code }) => code === 0).catch(() => false)
}

export async function tryExecUnixDefault (cmd: string, args?: readonly string[] | undefined, options?: SpawnOptionsWithoutStdio | undefined, cancellationToken?: vscode.CancellationToken): Promise<boolean> {
  return await execUnixDefault(cmd, args, options, cancellationToken).then(({ code }) => code === 0).catch(() => false)
}

// Execute a command in vscode terminal
export async function execVscodeTerminal (name: string, command: string, shellPath?: string): Promise<void> {
  const OS_TYPE = process.platform
  if (shellPath == null) { shellPath = OS_TYPE === 'win32' ? 'powershell.exe' : getDefaultShell() }

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
