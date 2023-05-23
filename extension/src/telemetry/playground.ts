import { workspace } from 'vscode'
import * as fs from 'fs'
import * as objHash from 'object-hash'

// State of projects converted from Flow Playground
export enum ProjectState{
  OPENED = 'OPENED',
  DEPLOYED = 'DEPLOYED'
}

interface PlaygroundProject {
  id: string
  updatedAt: string
}

var projectHash: string | null = null

export async function getPlaygroundProjectHash (): Promise<string | null> {
  if (projectHash === null) {
    // Search for Playground file in workspace
    const file = await workspace.findFiles('.vscode/*.play')
    if (file.length !== 1) {
      return null
    }

    const proj: PlaygroundProject = JSON.parse(fs.readFileSync(file[0].fsPath).toString())
    projectHash = 'Playground:' + objHash.sha1(proj)
  }

  return projectHash
}
