import * as vscode from 'vscode'
import * as path from 'path'
import { CADENCE_TEST_TAG, TEST_FUNCTION_PREFIX } from './constants'

export interface TestFunction {
  name: string
  range: vscode.Range
}

export class TestTrie {
  #items: vscode.TestItemCollection
  #controller: vscode.TestController

  constructor (controller: vscode.TestController) {
    this.#items = controller.items
    this.#controller = controller
  }

  /**
   * Add a file to the test trie
   * @param filePath Path to the file
   * @param tests List of test functions in the file
   */
  add (filePath: string, testFunctions: TestFunction[]): void {
    const workspaceNode: vscode.TestItem & { uri: vscode.Uri } | null = this.#getWorkspaceNode(filePath)
    if (workspaceNode == null) return
    let node: vscode.TestItem = workspaceNode

    const relativePath = path.relative(workspaceNode.uri.fsPath, filePath)
    const segments = path.normalize(relativePath).split(path.sep)
    for (const segment of segments) {
      if (node.uri == null) throw new Error('Node does not have a uri')
      const segmentPath = path.join(node.uri.fsPath, segment)
      let child = node.children.get(segment)
      if (child == null) {
        child = this.#createNode(segmentPath, false, true)
        node.children.add(child)
      }

      node = child
    }

    // Add all test functions for the file to the leaf node
    testFunctions.forEach((testFunction) => {
      const testItem = this.#controller.createTestItem(`${TEST_FUNCTION_PREFIX}${testFunction.name}`, testFunction.name, vscode.Uri.file(filePath))
      testItem.range = testFunction.range
      testItem.tags = [CADENCE_TEST_TAG]
      node.children.add(testItem)
    })
  }

  /**
   * Remove a file from the test trie
   * @param fsPath Path to the file or folder
   */
  remove (fsPath: string): void {
    const node = this.get(fsPath)
    if (node == null) return

    // Remove node from parent
    if (node.parent == null) return
    node.parent.children.delete(node.id)

    // Remove any empty parent nodes
    let parent = node.parent
    while (parent?.parent != null && parent.children.size === 0) {
      parent.parent.children.delete(parent.id)
      parent = parent.parent
    }
  }

  /**
   * Get a test item from the test trie
   */
  get (fsPath: string): vscode.TestItem | null {
    const workspaceNode: vscode.TestItem & { uri: vscode.Uri } | null = this.#getWorkspaceNode(fsPath)
    if (workspaceNode == null) return null
    let node: vscode.TestItem = workspaceNode

    const relativePath = path.relative(workspaceNode.uri.fsPath, fsPath)
    const segments = path.normalize(relativePath).split(path.sep)
    for (const segment of segments) {
      const child = node.children.get(segment)
      if (child == null) {
        return null
      }

      node = child
    }

    return node
  }

  /**
   * Clear all items from the test trie
  */
  clear (): void {
    this.#items.forEach((item) => {
      this.#items.delete(item.id)
    })
  }

  get rootNodes (): vscode.TestItem[] {
    const nodes: vscode.TestItem[] = []
    this.#items.forEach((item) => {
      if (item.parent == null) {
        nodes.push(item)
      }
    })
    return nodes
  }

  #createNode (filePath: string, isRoot: boolean = false, canResolveChildren: boolean = false): vscode.TestItem {
    const id = isRoot ? filePath : path.basename(filePath)
    const node = this.#controller.createTestItem(id, path.basename(filePath), vscode.Uri.file(filePath))
    node.tags = [CADENCE_TEST_TAG]
    node.canResolveChildren = canResolveChildren
    return node
  }

  #getWorkspaceNode (filepath: string): vscode.TestItem & { uri: vscode.Uri } | null {
    const normalizedPath = path.normalize(filepath)
    let containingFolder: vscode.WorkspaceFolder | undefined
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      if (normalizedPath.startsWith(folder.uri.fsPath) && (containingFolder == null || folder.uri.fsPath.length > containingFolder.uri.fsPath.length)) {
        containingFolder = folder
        break
      }
    }
    if (containingFolder == null) return null

    const node: vscode.TestItem = this.#items.get(containingFolder.uri.fsPath) ?? this.#createNode(containingFolder.uri.fsPath, true, true)
    this.#items.add(node)
    return node as vscode.TestItem & { uri: vscode.Uri }
  }
}

/**
 * A class that allows mutations to be queued and executed sequentially
 */
export class QueuedMutator<T> {
  #queue: Promise<void> = Promise.resolve()
  #subject: T
  #recoverError: (error: Error, abortMutations: () => void) => Promise<void> | void

  constructor (subject: T, recoverError: (error: Error, abortMutations: () => void) => Promise<void> | void) {
    this.#subject = subject
    this.#recoverError = recoverError
  }

  async mutate (task: (subject: T) => Promise<void>): Promise<void> {
    const mutationPromise = this.#queue.then(async () => await task(this.#subject))
    this.#queue = mutationPromise.catch(async (error) => {
      await this.#recoverError(error, () => {
        this.#queue = Promise.resolve()
      })
    })
    await mutationPromise
  }

  async getState (): Promise<T> {
    let previousTask: Promise<void> | null = null
    while (this.#queue !== previousTask) {
      await this.#queue
      previousTask = this.#queue
    }
    return this.#subject
  }
}
