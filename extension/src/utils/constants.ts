export const FILE_PATH_EMPTY = ''

export const PRINT_ENV_POWERSHELL = `
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
