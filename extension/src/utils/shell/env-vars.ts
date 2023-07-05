
import { StateCache } from '../state-cache'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { getDefaultShell } from './default-shell'

const PRINT_ENV_POWERSHELL = `
$machineEnv = [Environment]::GetEnvironmentVariables('Machine')
$userEnv = [Environment]::GetEnvironmentVariables('User')

$env = @{}
$machineEnv.Keys | ForEach-Object {
    $env[$_] = $machineEnv[$_]
}

$userEnv.Keys | ForEach-Object {
    $env[$_] = $userEnv[$_]
}

# handle PATH special ase
$machinePath = $machineEnv['Path']
$userPath = $userEnv['Path']

$env['Path'] = $machinePath + ';' + $userPath

# Iterate over the dictionary and print key-value pairs
foreach ($key in $env.Keys) {
    Write-Host "$key=$($env[$key])"
}`

export const envVars = new StateCache(async () => {
  const shell = getDefaultShell()
  return await getEnvVars(shell).catch(() => process.env)
})

async function getEnvVars (shell: string): Promise<{ [key: string]: string | undefined }> {
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
