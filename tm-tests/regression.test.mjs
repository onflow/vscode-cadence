/**
 * Regression tests for TextMate grammar across official Flow repositories
 * These tests ensure that scope leaks do not occur in real-world Cadence code
 */

import { expect } from 'chai'
import tm from 'vscode-textmate'
import { loadWASM, OnigScanner, OnigString } from 'onigasm'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const { Registry } = tm

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Official Flow repositories to test against
const FLOW_REPOS = [
  { name: 'flow-ft', url: 'https://github.com/onflow/flow-ft.git' },
  { name: 'flow-nft', url: 'https://github.com/onflow/flow-nft.git' },
  { name: 'flow-core-contracts', url: 'https://github.com/onflow/flow-core-contracts.git' },
  { name: 'hybrid-custody', url: 'https://github.com/onflow/hybrid-custody.git' },
  { name: 'flow-evm-bridge', url: 'https://github.com/onflow/flow-evm-bridge.git' },
  { name: 'FlowActions', url: 'https://github.com/onflow/FlowActions.git' },
  { name: 'nft-storefront', url: 'https://github.com/onflow/nft-storefront.git' },
  { name: 'nft-catalog', url: 'https://github.com/onflow/nft-catalog.git' },
  { name: 'lost-and-found', url: 'https://github.com/Flowtyio/lost-and-found.git' }
]

const REPOS_DIR = join(__dirname, '.repos')

describe('Regression Tests - Official Flow Repositories', () => {
  let grammar

  before(async function () {
    this.timeout(120000) // 2 minutes for cloning repos

    // Initialize WASM
    const wasmPath = join(__dirname, '../node_modules/onigasm/lib/onigasm.wasm')
    const wasmBin = await fs.readFile(wasmPath)
    const wasmBuffer = wasmBin.buffer.slice(
      wasmBin.byteOffset,
      wasmBin.byteOffset + wasmBin.byteLength
    )
    await loadWASM(wasmBuffer)

    // Load grammar
    const grammarPath = join(__dirname, '../extension/language/syntaxes/cadence.tmGrammar.json')
    const grammarData = await fs.readFile(grammarPath, 'utf8')
    const grammarRaw = JSON.parse(grammarData)

    const registry = new Registry({
      onigLib: Promise.resolve({
        createOnigScanner: (patterns) => new OnigScanner(patterns),
        createOnigString: (s) => new OnigString(s)
      }),
      loadGrammar: async () => grammarRaw
    })

    grammar = await registry.loadGrammar('source.cadence')

    // Clone or update repositories
    await fs.mkdir(REPOS_DIR, { recursive: true })

    for (const repo of FLOW_REPOS) {
      const repoPath = join(REPOS_DIR, repo.name)
      try {
        await fs.access(repoPath)
        console.log(`  Updating ${repo.name}...`)
        execSync('git pull', { cwd: repoPath, stdio: 'inherit' })
      } catch {
        console.log(`  Cloning ${repo.name}...`)
        execSync(`git clone --depth 1 ${repo.url} ${repoPath}`, { stdio: 'inherit' })
      }
    }
  })

  /**
   * Find all .cdc files in a directory recursively
   */
  async function findCadenceFiles (dir) {
    const files = []
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...await findCadenceFiles(fullPath))
      } else if (entry.isFile() && entry.name.endsWith('.cdc')) {
        files.push(fullPath)
      }
    }

    return files
  }

  /**
   * Tokenize a file and check for scope leaks
   */
  function checkFileForScopeLeaks (filePath, content) {
    const lines = content.split('\n')
    let ruleStack = null

    // Tokenize every line
    for (let i = 0; i < lines.length; i++) {
      const result = grammar.tokenizeLine(lines[i], ruleStack)
      ruleStack = result.ruleStack
    }

    // Check the last line for scope leaks
    const lastResult = grammar.tokenizeLine(lines[lines.length - 1], ruleStack)
    
    if (lastResult.tokens.length === 0) {
      return { success: true }
    }

    const lastToken = lastResult.tokens[lastResult.tokens.length - 1]
    
    // Should only have base "source.cadence" scope or simple punctuation
    // No meta.*, storage.*, entity.*, etc. should leak beyond their context
    if (lastToken.scopes[0] !== 'source.cadence') {
      return {
        success: false,
        error: `First scope is not source.cadence: ${lastToken.scopes[0]}`
      }
    }

    // Check for problematic scope leaks (not just any extra scope)
    // We're mainly concerned about meta.definition.*, meta.function-call.*, etc.
    // that indicate unclosed blocks or expressions
    const problematicScopes = lastToken.scopes.filter(s => 
      s.startsWith('meta.definition.') ||
      s.startsWith('meta.function-call.') ||
      s.startsWith('meta.group.') ||
      s.startsWith('string.') ||
      (s.startsWith('meta.type.') && s !== 'meta.type.arguments.cadence')
    )
    
    if (problematicScopes.length > 0) {
      return {
        success: false,
        error: `Problematic scopes leaked: ${JSON.stringify(problematicScopes)}`
      }
    }

    return { success: true }
  }

  // Generate test for each repository
  for (const repo of FLOW_REPOS) {
    describe(repo.name, () => {
      it('should not have scope leaks in any .cdc files', async function () {
        this.timeout(60000) // 1 minute per repo

        const repoPath = join(REPOS_DIR, repo.name)
        const cdcFiles = await findCadenceFiles(repoPath)

        expect(cdcFiles.length).to.be.greaterThan(0, `No .cdc files found in ${repo.name}`)

        const failures = []

        for (const filePath of cdcFiles) {
          const relativePath = filePath.replace(repoPath, repo.name)
          try {
            const content = await fs.readFile(filePath, 'utf8')
            const result = checkFileForScopeLeaks(filePath, content)

            if (!result.success) {
              failures.push({
                file: relativePath,
                error: result.error
              })
            }
          } catch (err) {
            failures.push({
              file: relativePath,
              error: `Failed to process: ${err.message}`
            })
          }
        }

        // Report all failures at once
        if (failures.length > 0) {
          const errorMsg = failures
            .map(f => `  - ${f.file}: ${f.error}`)
            .join('\n')
          
          throw new Error(`Scope leaks detected in ${failures.length} file(s):\n${errorMsg}`)
        }
      })
    })
  }
})

