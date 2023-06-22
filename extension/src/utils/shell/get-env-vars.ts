import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { PRINT_ENV_POWERSHELL } from '../constants'

export async function getEnvVars (shell: string): Promise<{ [key: string]: string | undefined }> {
  const OS_TYPE = process.platform
  let childProcess: ChildProcessWithoutNullStreams
  if (OS_TYPE === 'win32') {
    childProcess = spawn('powershell', [PRINT_ENV_POWERSHELL], { env: {} })
  } else {
    childProcess = spawn(shell, ['-l', '-i', '-c', 'env'])
  }

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
