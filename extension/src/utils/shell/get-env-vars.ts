import { spawn } from 'child_process'
import * as vscode from 'vscode'
import { StateCache } from '../state-cache'

export const envVars = new StateCache(async () => {
  return await getEnvVars()
})

async function getEnvVars (): Promise<{ [key: string]: string | undefined }> {
  const OS_TYPE = process.platform
  if (OS_TYPE === 'win32') {
    return await getEnvVarsWindows()
  } else {
    return await getEnvVarsUnix()
  }
}

async function getEnvVarsUnix (): Promise<{ [key: string]: string | undefined }> {
  const shell = vscode.env.shell
  const childProcess = spawn(shell, ['-l', '-i', '-c', 'env'])

  let stdout = ''
  let stderr = ''

  childProcess.stdout.on('data', (data) => {
    stdout += String(data)
  })

  childProcess.stderr.on('data', (data) => {
    stderr += String(data)
  })

  return await new Promise((resolve, reject) => {
    childProcess.on('close', (code) => {
      if (code === 0) {
        const env: { [key: string]: string | undefined } = process.env
        stdout.split('\n').forEach((line) => {
          const [key, value] = line.split('=')
          if (key !== undefined && value !== undefined) {
            env[key] = value
          }
        })
        resolve(env)
      } else {
        reject(stderr)
      }
    })
  })
}

async function getEnvVarsWindows (): Promise<{ [key: string]: string }> {
  const childProcess = spawn('powershell', ['-Command', 'Start-Process powershell --NoNewWindow -Command "Get-ChildItem -Path Env:"'], { env: {} })

  let stdout = ''
  let stderr = ''

  childProcess.stdout.on('data', (data) => {
    stdout += String(data)
  })

  childProcess.stderr.on('data', (data) => {
    stderr += String(data)
  })

  return await new Promise((resolve, reject) => {
    childProcess.on('close', (code) => {
      if (code === 0) {
        const env: { [key: string]: string } = {}
        stdout.split('\r\n').slice(2).forEach((line) => {
          const [key, value] = line.split(/\s+/, 2).map(x => x.trim())
          if (key !== undefined && value !== undefined) {
            env[key] = value
          }
        })
        resolve(env)
      } else {
        reject(stderr)
      }
    })
  })
}
