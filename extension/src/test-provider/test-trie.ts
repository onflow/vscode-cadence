import * as vscode from "vscode"
import * as path from "path"
import { CADENCE_TEST_TAG } from "./constants"

export class TestTrie {
  #items: vscode.TestItemCollection
  #controller: vscode.TestController

  constructor (controller: vscode.TestController) {
    // root is a dummy node
    this.#items = controller.items
    this.#controller = controller
  }

  /**
   * Add a file to the test trie
   * @param filePath Path to the file
   * @param tests List of test functions in the file
   */
  add (filePath: string, testItems: vscode.TestItem[]): void {
    const workspaceNode: vscode.TestItem & { uri: vscode.Uri } | null = this.#getWorkspaceNode(filePath)
    if (workspaceNode == null) return
    let node: vscode.TestItem = workspaceNode

    const relativePath = path.relative(workspaceNode.uri.fsPath, filePath)
    const segments = path.normalize(relativePath).split(path.sep)
    for (const [index, segment] of Object.entries(segments)) {
      const segmentPath = path.join(node.id, segment)
      let child = node.children.get(segmentPath)
      if (child == null) {
        child = this.#createNode(segmentPath, Number(index) === segments.length - 1)
        node.children.add(child)
      } 

      node = child
    }

    // Add all test functions for the file to the leaf node
    testItems.forEach((testItem) => {
      node.children.add(testItem)
    })
  }

  /**
   * Remove a file from the test trie
   * @param fsPath Path to the file or folder
   */
  remove (fsPath: string): void {
    const workspaceNode: vscode.TestItem & { uri: vscode.Uri } | null = this.#getWorkspaceNode(fsPath)
    if (workspaceNode == null) return
    let node: vscode.TestItem = workspaceNode

    const relativePath = path.relative(workspaceNode.uri.fsPath, fsPath)
    const segments = path.normalize(relativePath).split(path.sep)
    for (const segment of segments) {
      const segmentPath = path.join(node.id, segment)
      let child = node.children.get(segmentPath)
      if (child == null) {
        return
      } 

      node = child
    }

    node.parent!.children.delete(node.id)

    // Remove any empty parent nodes
    let parent = node.parent
    while (parent != null && parent.parent != null && parent.children.size === 0) {
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
      const segmentPath = path.join(node.id, segment)
      let child = node.children.get(segmentPath)
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

  #createNode (filePath: string, canResolveChildren: boolean = false): vscode.TestItem {
    const node = this.#controller.createTestItem(filePath, path.basename(filePath), vscode.Uri.file(filePath))
    node.tags = [CADENCE_TEST_TAG];
    node.canResolveChildren = !canResolveChildren
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

    let node: vscode.TestItem = this.#items.get(containingFolder.uri.fsPath) ?? this.#createNode(containingFolder.uri.fsPath)
    this.#items.add(node)
    return node as vscode.TestItem & { uri: vscode.Uri }
  }
}

export class QueuedMutator<T> {
  #queue: Promise<void> = Promise.resolve()
  #subject: T
  #recoverError: (error: Error) => Promise<void> | void

  constructor (subject: T, recoverError: (error: Error) => Promise<void> | void) {
    this.#subject = subject
    this.#recoverError = recoverError
  }

  async mutate (task: (subject: T) => Promise<void>): Promise<void> {
    const mutationPromise = this.#queue.then(() => task(this.#subject))
    this.#queue = mutationPromise.catch(async (error) => {
      await this.#recoverError(error)
    })
    await mutationPromise
  }

  async flush (): Promise<void> {
    let previousTask: Promise<void> | null = null
    while (this.#queue !== previousTask) {
      await this.#queue
      previousTask = this.#queue
    }
  }

  get state (): T {
    return this.#subject
  }

  async cancelMutations (): Promise<void> {
    this.#queue = Promise.resolve()
  }
}