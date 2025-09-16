import * as assert from 'assert'
import { TestTrie } from '../../src/test-provider/test-trie'
import * as vscode from 'vscode'
import * as path from 'path'
import { beforeEach, afterEach } from 'mocha'
import { MaxTimeout } from '../globals'

interface TreeResult {
  id: string
  label: string
  tags: string[]
  range?: vscode.Range
  uri?: string
  children?: TreeResult[]
}
interface TreeResultComparable {
  id: string
  label: string
  tags: string[]
  range?: { start: { line: number, character: number }, end: { line: number, character: number } }
  uri?: string
  children?: TreeResultComparable[]
}
function expectTreeToEqual (testCollection: vscode.TestItemCollection, expected: TreeResult[]): void {
  function buildActualTree (testCollection: vscode.TestItemCollection): TreeResult[] {
    const items: TreeResult[] = []
    testCollection.forEach((item) => {
      const children = buildActualTree(item.children)
      const result: TreeResult = {
        id: item.id,
        label: item.label,
        uri: item.uri?.fsPath,
        tags: item.tags?.map?.((tag) => tag.id) ?? []
      }
      if (item.range != null) {
        result.range = item.range
      }
      if (children.length > 0) {
        result.children = children
      }
      items.push(result)
    })
    return items
  }

  function makeComparable (tree: TreeResult[]): TreeResultComparable[] {
    return tree.map((item) => {
      const result: TreeResultComparable = {
        id: item.id,
        label: item.label,
        uri: item.uri,
        tags: item.tags
      }
      if (item.range != null) {
        result.range = {
          start: { line: item.range.start.line, character: item.range.start.character },
          end: { line: item.range.end.line, character: item.range.end.character }
        }
      }
      if (item.children != null) {
        result.children = makeComparable(item.children)
      }
      return result
    })
  }

  const actual = buildActualTree(testCollection)
  assert.deepStrictEqual(makeComparable(actual), makeComparable(expected))
}

suite('test trie tests', () => {
  let testController: vscode.TestController
  let testTrie: TestTrie
  let workspaceFolder: vscode.WorkspaceFolder

  beforeEach(function () {
    this.timeout(MaxTimeout)
    testController = vscode.tests.createTestController('test-controller', 'test-controller')
    testTrie = new TestTrie(testController)

    if (vscode.workspace.workspaceFolders?.[0] == null) {
      throw new Error('No workspace folders')
    }
    workspaceFolder = vscode.workspace.workspaceFolders[0]
  })

  afterEach(function () {
    this.timeout(MaxTimeout)
    testController.dispose()
  })

  test('adds and removes files from test tree', () => {
    const workspaceRoot = workspaceFolder.uri.fsPath

    testTrie.add(path.resolve(workspaceRoot, 'test1.cdc'), [
      { name: 'test1', range: new vscode.Range(0, 0, 0, 0) },
      { name: 'test2', range: new vscode.Range(1, 2, 3, 4) }
    ])
    testTrie.add(path.resolve(workspaceRoot, 'test2.cdc'), [
      { name: 'test1', range: new vscode.Range(5, 6, 7, 8) },
      { name: 'test2', range: new vscode.Range(4, 3, 2, 1) }
    ])

    expectTreeToEqual(testController.items, [{
      id: workspaceFolder.uri.fsPath,
      label: 'workspace',
      tags: ['cadence'],
      uri: workspaceFolder.uri.fsPath,
      children: [
        {
          id: 'test1.cdc',
          label: 'test1.cdc',
          uri: path.resolve(workspaceRoot, 'test1.cdc'),
          tags: ['cadence'],
          children: [
            {
              id: ':test1',
              label: 'test1',
              tags: ['cadence'],
              uri: path.resolve(workspaceRoot, 'test1.cdc'),
              range: new vscode.Range(0, 0, 0, 0)
            },
            {
              id: ':test2',
              label: 'test2',
              tags: ['cadence'],
              uri: path.resolve(workspaceRoot, 'test1.cdc'),
              range: new vscode.Range(1, 2, 3, 4)
            }
          ]
        },
        {
          id: 'test2.cdc',
          label: 'test2.cdc',
          uri: path.resolve(workspaceRoot, 'test2.cdc'),
          tags: ['cadence'],
          children: [
            {
              id: ':test1',
              label: 'test1',
              tags: ['cadence'],
              uri: path.resolve(workspaceRoot, 'test2.cdc'),
              range: new vscode.Range(5, 6, 7, 8)
            },
            {
              id: ':test2',
              label: 'test2',
              tags: ['cadence'],
              uri: path.resolve(workspaceRoot, 'test2.cdc'),
              range: new vscode.Range(4, 3, 2, 1)
            }
          ]
        }
      ]
    }])

    testTrie.remove(path.resolve(workspaceRoot, 'test1.cdc'))

    expectTreeToEqual(testController.items, [{
      id: workspaceFolder.uri.fsPath,
      label: 'workspace',
      tags: ['cadence'],
      uri: workspaceFolder.uri.fsPath,
      children: [
        {
          id: 'test2.cdc',
          label: 'test2.cdc',
          uri: path.resolve(workspaceRoot, 'test2.cdc'),
          tags: ['cadence'],
          children: [
            {
              id: ':test1',
              label: 'test1',
              tags: ['cadence'],
              uri: path.resolve(workspaceRoot, 'test2.cdc'),
              range: new vscode.Range(5, 6, 7, 8)
            },
            {
              id: ':test2',
              label: 'test2',
              tags: ['cadence'],
              uri: path.resolve(workspaceRoot, 'test2.cdc'),
              range: new vscode.Range(4, 3, 2, 1)
            }
          ]
        }
      ]
    }])
  })

  test('adds files contained in folders to test tree', () => {
    const workspaceRoot = workspaceFolder.uri.fsPath

    testTrie.add(path.resolve(workspaceRoot, 'folder1/test.cdc'), [
      { name: 'test', range: new vscode.Range(12, 11, 10, 9) }
    ])
    testTrie.add(path.resolve(workspaceRoot, 'test2.cdc'), [
      { name: 'test1', range: new vscode.Range(5, 6, 7, 8) }
    ])

    expectTreeToEqual(testController.items, [{
      id: workspaceFolder.uri.fsPath,
      label: 'workspace',
      tags: ['cadence'],
      uri: workspaceFolder.uri.fsPath,
      children: [
        {
          id: 'folder1',
          label: 'folder1',
          uri: path.resolve(workspaceRoot, 'folder1'),
          tags: ['cadence'],
          children: [
            {
              id: 'test.cdc',
              label: 'test.cdc',
              uri: path.resolve(workspaceRoot, 'folder1/test.cdc'),
              tags: ['cadence'],
              children: [
                {
                  id: ':test',
                  label: 'test',
                  tags: ['cadence'],
                  uri: path.resolve(workspaceRoot, 'folder1/test.cdc'),
                  range: new vscode.Range(12, 11, 10, 9)
                }
              ]
            }
          ]
        },
        {
          id: 'test2.cdc',
          label: 'test2.cdc',
          uri: path.resolve(workspaceRoot, 'test2.cdc'),
          tags: ['cadence'],
          children: [
            {
              id: ':test1',
              label: 'test1',
              tags: ['cadence'],
              uri: path.resolve(workspaceRoot, 'test2.cdc'),
              range: new vscode.Range(5, 6, 7, 8)
            }
          ]
        }
      ]
    }])
  })

  test('removing last test from folder cleans up all parent items', () => {
    const workspaceRoot = workspaceFolder.uri.fsPath

    testTrie.add(path.resolve(workspaceRoot, 'folder1/abc/test4.cdc'), [
      { name: 'test2', range: new vscode.Range(12, 11, 10, 9) }
    ])

    testTrie.remove(path.resolve(workspaceRoot, 'folder1/abc/test4.cdc'))

    expectTreeToEqual(testController.items, [{
      id: workspaceFolder.uri.fsPath,
      label: 'workspace',
      tags: ['cadence'],
      uri: workspaceFolder.uri.fsPath
    }])
  })

  test('gets file from test trie', () => {
    const workspaceRoot = workspaceFolder.uri.fsPath

    testTrie.add(path.resolve(workspaceRoot, 'foo/test1.cdc'), [
      { name: 'test1', range: new vscode.Range(1, 2, 3, 4) }
    ])

    const testItem = testTrie.get(path.resolve(workspaceRoot, 'foo/test1.cdc'))
    if (testItem == null) throw new Error('testItem is null')

    assert.strictEqual(testItem.id, 'test1.cdc')
    assert.strictEqual(testItem.label, 'test1.cdc')
    assert.strictEqual(testItem.uri?.fsPath, path.resolve(workspaceRoot, 'foo/test1.cdc'))
    expectTreeToEqual(testItem.children, [{
      id: ':test1',
      label: 'test1',
      tags: ['cadence'],
      uri: path.resolve(workspaceRoot, 'foo/test1.cdc'),
      range: new vscode.Range(1, 2, 3, 4)
    }])
  })

  test('gets folder from test trie', () => {
    const workspaceRoot = workspaceFolder.uri.fsPath

    testTrie.add(path.resolve(workspaceRoot, 'foo/test1.cdc'), [
      { name: 'test1', range: new vscode.Range(1, 2, 3, 4) }
    ])

    const testItem = testTrie.get(path.resolve(workspaceRoot, 'foo'))
    if (testItem == null) throw new Error('testItem is null')

    assert.strictEqual(testItem.id, 'foo')
    assert.strictEqual(testItem.label, 'foo')
    assert.strictEqual(testItem.uri?.fsPath, path.resolve(workspaceRoot, 'foo'))
    expectTreeToEqual(testItem.children, [{
      id: 'test1.cdc',
      label: 'test1.cdc',
      uri: path.resolve(workspaceRoot, 'foo/test1.cdc'),
      tags: ['cadence'],
      children: [
        {
          id: ':test1',
          label: 'test1',
          tags: ['cadence'],
          uri: path.resolve(workspaceRoot, 'foo/test1.cdc'),
          range: new vscode.Range(1, 2, 3, 4)
        }
      ]
    }])
  })
})
