import { existsSync } from 'fs'
import * as path from 'path'
import { workspace } from 'vscode'

export const FILE_PATH_EMPTY = ''

export async function delay (seconds: number): Promise<void> {
  await new Promise((resolve, reject) => {
    setTimeout(() => resolve(''), seconds * 1000)
  })
}

export function pathsAreEqual (path1: string, path2: string): boolean {
  path1 = path.resolve(path1)
  path2 = path.resolve(path2)
  if (process.platform === 'win32') { return path1.toLowerCase() === path2.toLowerCase() }
  return path1 === path2
}

export function findFilesInAnyWorkspace (filepath: string): string[] {
  return (workspace.workspaceFolders?.reduce<string[]>(
    (res, folder) => {
      const filePath = path.resolve(folder.uri.fsPath, filepath)
      if (existsSync(filePath)) {
        res.push(filePath)
      }
      return res
    },
    []
  )) ?? []
}