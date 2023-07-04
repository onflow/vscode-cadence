export function getDefaultShell() {
  if (process.platform === 'win32') {
    return 'powershell'
  } else if(process.platform === 'darwin') {
    return 'zsh'
  } else {
    return 'bash'
  }
}