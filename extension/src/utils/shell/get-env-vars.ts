import { spawn } from "child_process"
import * as vscode from 'vscode'
import { StateCache } from "../state-cache"

export const envVars = new StateCache(async () => {
  const shell = vscode.env.shell
  return getEnvVars(shell)
})

async function getEnvVars (shell: string): Promise<{[key: string]: string | undefined}> {
  const OS_TYPE = process.platform
  if (OS_TYPE === 'win32') {
    return await getEnvVarsWindows(shell)
  } else {
    return await getEnvVarsUnix(shell)
  }
}

async function getEnvVarsUnix(shell: string): Promise<{[key: string]: string | undefined}> {
  const child_process = spawn(shell, ['-l', '-i', '-c', "env"])

  let stdout = ''
  let stderr = ''

  child_process.stdout.on('data', (data) => {
    stdout += data
  })

  child_process.stderr.on('data', (data) => {
    stderr += data
  })

  return new Promise((resolve, reject) => {
    child_process.on('close', (code) => {
      if (code === 0) {
        const env: {[key: string]: string | undefined} = process.env
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

async function getEnvVarsWindows(shell: string): Promise<{[key: string]: string}> {
  const child_process = spawn(shell, ['-NoProfile', '-Command', 'Get-ChildItem Env:'])

  let stdout = ''
  let stderr = ''

  child_process.stdout.on('data', (data) => {
    stdout += data
  })

  child_process.stderr.on('data', (data) => {
    stderr += data
  })

  return new Promise((resolve, reject) => {
    child_process.on('close', (code) => {
      if (code === 0) {
        const env: {[key: string]: string} = {}
        stdout.split('\r\n').forEach((line) => {
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