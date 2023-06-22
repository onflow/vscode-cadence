
import { StateCache } from '../state-cache'
import { getEnvVars } from './get-env-vars'
import * as vscode from 'vscode'

export const envVars = new StateCache(async () => {
  const shell = vscode.env.shell
  return await getEnvVars(shell)
})
