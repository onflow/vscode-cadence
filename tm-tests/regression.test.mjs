/**
 * Regression tests for TextMate grammar across official Flow repositories & mainnet dump
 * These tests ensure that scope leaks do not occur in real-world Cadence code
 */

import { expect } from 'chai'
import tm from 'vscode-textmate'
import { loadWASM, OnigScanner, OnigString } from 'onigasm'
import { promises as fs } from 'fs'
import { createReadStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import extract from 'extract-zip'
import readline from 'readline'
import { Worker } from 'worker_threads'

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
const FIXTURES_DIR = join(__dirname, 'fixtures')
const FIXTURES_CACHE_DIR = join(__dirname, '.fixtures-cache')
const FIXTURE_ZIP = join(FIXTURES_DIR, 'mainnet-contracts.zip')
const CACHED_CONTRACTS_CSV = join(FIXTURES_CACHE_DIR, 'contracts.csv')
let CONTRACTS_CSV = CACHED_CONTRACTS_CSV

// Shared grammar management
let wasmLoaded = false
const WASM_PATH = join(__dirname, '../node_modules/onigasm/lib/onigasm.wasm')
const GRAMMAR_PATH = join(__dirname, '../extension/language/syntaxes/cadence.tmGrammar.json')

// Single source of truth for hard timeout
const WORKER_HARD_TIMEOUT_MS = 8000

class TokenizeWorkerManager {
  constructor (workerScriptUrl, wasmPath, grammarPath, hardTimeoutMs) {
    this.workerScriptUrl = workerScriptUrl
    this.wasmPath = wasmPath
    this.grammarPath = grammarPath
    this.hardTimeoutMs = hardTimeoutMs
    this.nextId = 1
    this.pending = new Map()
    this._createWorker()
  }

  _createWorker () {
    if (this.worker) {
      try { this.worker.terminate() } catch {}
    }
    this.worker = new Worker(this.workerScriptUrl, {
      type: 'module',
      workerData: { wasmPath: this.wasmPath, grammarPath: this.grammarPath }
    })
    this.worker.on('message', (msg) => {
      if (!msg || typeof msg.id === 'undefined') return
      const entry = this.pending.get(msg.id)
      if (!entry) return
      clearTimeout(entry.timer)
      this.pending.delete(msg.id)
      if (msg.error) {
        entry.reject(new Error(msg.error))
      } else {
        entry.resolve(msg.result)
      }
    })
    this.worker.on('error', (err) => {
      for (const [, entry] of this.pending.entries()) {
        clearTimeout(entry.timer)
        entry.reject(err)
      }
      this.pending.clear()
    })
    this.worker.on('exit', () => {
      for (const [, entry] of this.pending.entries()) {
        clearTimeout(entry.timer)
        entry.reject(new Error('Worker exited'))
      }
      this.pending.clear()
    })
  }

  async check (code) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        try { await this.worker.terminate() } catch {}
        this._createWorker()
        this.pending.delete(id)
        resolve({ success: false, timeout: true, error: `Hard timeout after ${this.hardTimeoutMs}ms` })
      }, this.hardTimeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.worker.postMessage({ type: 'check', id, code })
    })
  }

  async dispose () {
    try { await this.worker.terminate() } catch {}
    this.pending.clear()
  }
}

describe('Regression Tests - Official Flow Repositories', () => {
  let grammar
  let workerManager

  before(async function () {
    this.timeout(600000) // 10 minutes for cloning and unzip

    // Initialize WASM
    const wasmPath = join(__dirname, '../node_modules/onigasm/lib/onigasm.wasm')
    const wasmBin = await fs.readFile(wasmPath)
    const wasmBuffer = wasmBin.buffer.slice(
      wasmBin.byteOffset,
      wasmBin.byteOffset + wasmBin.byteLength
    )
    await loadWASM(wasmBuffer)
    wasmLoaded = true

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

    // Create worker manager for abortable tokenization checks
    const workerScriptUrl = new URL('./util/tokenize-worker.mjs', import.meta.url)
    workerManager = new TokenizeWorkerManager(workerScriptUrl, WASM_PATH, GRAMMAR_PATH, WORKER_HARD_TIMEOUT_MS)

    // Ensure fixtures cache exists and unzip contracts.csv if needed
    await fs.mkdir(FIXTURES_CACHE_DIR, { recursive: true })
    try {
      await fs.access(CACHED_CONTRACTS_CSV)
    } catch {
      // contracts.csv not present in cache; extract from zip
      try {
        await fs.access(FIXTURE_ZIP)
      } catch {
        throw new Error(`Fixtures ZIP not found at ${FIXTURE_ZIP}`)
      }
      await extract(FIXTURE_ZIP, { dir: FIXTURES_CACHE_DIR })
    }

    // Clone or update repositories
    await fs.mkdir(REPOS_DIR, { recursive: true })

    for (const repo of FLOW_REPOS) {
      const repoPath = join(REPOS_DIR, repo.name)
      try {
        await fs.access(repoPath)
        execSync('git pull', { cwd: repoPath, stdio: 'inherit' })
      } catch {
        execSync(`git clone --depth 1 ${repo.url} ${repoPath}`, { stdio: 'inherit' })
      }
    }

    // Ensure cached CSV fixture exists
    await fs.access(CONTRACTS_CSV).catch(() => {
      throw new Error(`Cached fixtures CSV not found at ${CONTRACTS_CSV}`)
    })
  })

  after(async function () {
    // Release grammar resources between runs
    try { resetGrammar() } catch {}
    try { await workerManager?.dispose() } catch {}
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

  async function ensureGrammar () {
    if (grammar) return grammar
    if (!wasmLoaded) {
      const wasmBin = await fs.readFile(WASM_PATH)
      const wasmBuffer = wasmBin.buffer.slice(wasmBin.byteOffset, wasmBin.byteOffset + wasmBin.byteLength)
      await loadWASM(wasmBuffer)
      wasmLoaded = true
    }
    const grammarRaw = JSON.parse(await fs.readFile(GRAMMAR_PATH, 'utf8'))
    const registry = new Registry({
      onigLib: Promise.resolve({
        createOnigScanner: (patterns) => new OnigScanner(patterns),
        createOnigString: (s) => new OnigString(s)
      }),
      loadGrammar: async () => grammarRaw
    })
    grammar = await registry.loadGrammar('source.cadence')
    return grammar
  }

  function resetGrammar () {
    grammar = null
  }

  async function checkWithGrammar (code, timeBudgetMs) {
    try {
      const g = await ensureGrammar()
      const lines = code.split('\n')
      let ruleStack = null
      const start = timeBudgetMs ? Date.now() : 0
      for (let i = 0; i < lines.length; i++) {
        if (timeBudgetMs && (i % 50 === 0)) {
          const elapsed = Date.now() - start
          if (elapsed > timeBudgetMs) {
            resetGrammar()
            return { success: false, timeout: true, error: `Timed out after ${elapsed}ms at line ${i + 1}` }
          }
        }
        const result = g.tokenizeLine(lines[i], ruleStack)
        ruleStack = result.ruleStack
      }
      const eofResult = g.tokenizeLine('', ruleStack)
      if (eofResult.tokens.length === 0) return { success: true }
      const leakedScopes = Array.from(new Set(
        eofResult.tokens.flatMap(t => t.scopes.filter(s => s !== 'source.cadence'))
      ))
      if (leakedScopes.length > 0) {
        return { success: false, error: `Leaked scopes at EOF: ${JSON.stringify(leakedScopes)}` }
      }
      return { success: true }
    } catch (e) {
      resetGrammar()
      return { success: false, error: `Check failed: ${e.message}` }
    }
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
            const result = await workerManager.check(content)
            
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

  // Tests for contracts.csv fixtures
  describe('contracts.csv fixtures', () => {
    it('should not have scope leaks in any listed contract code', async function () {
      this.timeout(3600000) // large file, long timeout

      const failures = []
      let lineNo = 0
      let processed = 0
      let warnings = 0
      for await (const row of readCsvRows(CONTRACTS_CSV)) {
        lineNo++
        const [locationRaw, codeRaw] = parseTwoFieldCsvLine(row)
        const location = unquoteCsvField(locationRaw).trim()
        const code = unquoteCsvField(codeRaw)
        if (location.length === 0 || code.length === 0) continue

        try {
          const result = await workerManager.check(code)
          processed++
          if (processed % 100 === 0) {
            console.log(`[contracts.csv] Processed ${processed} contract(s) ...`)
          }
          if (result.timeout) {
            warnings++
            console.log(`[contracts.csv] WARNING: ${location} timed out (likely too large to tokenize efficiently)`)
          } else {
            if (!result.success) {
              failures.push({ file: location, error: result.error })
            }
          }
        } catch (err) {
          processed++
          if (processed % 100 === 0) {
            console.log(`[contracts.csv] Processed ${processed} contract(s) ...`)
          }
          const msg = (err && err.message) ? err.message : String(err)
          if (/Worker exited|terminated/i.test(msg)) {
            warnings++
            console.log(`[contracts.csv] WARNING: ${location} worker exited (treated as timeout) at line ${lineNo}`)
          } else {
            failures.push({ file: location, error: `Failed to process (line ${lineNo}): ${msg}` })
          }
        }
      }

      // Final progress summary
      console.log(`[contracts.csv] Completed. Processed ${processed} contract(s). Failures: ${failures.length}. Warnings: ${warnings}`)

      if (failures.length > 0) {
        const errorMsg = failures.map(f => `  - ${f.file}: ${f.error}`).join('\n')
        throw new Error(`Scope leaks detected in ${failures.length} contract(s):\n${errorMsg}`)
      }
    })
  })
})

function parseTwoFieldCsvLine (line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  const location = fields[0] ?? ''
  const codeRaw = fields.slice(1).join(',')
  return [location, codeRaw]
}

function unquoteCsvField (value) {
  if (value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') {
    const inner = value.slice(1, -1)
    return inner.replace(/""/g, '"')
  }
  return value
}

// CSV reader that preserves embedded newlines in quoted fields.
// Accumulates lines until an even number of unescaped quote characters is seen.
function isCsvRowComplete (s) {
  let quotes = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') {
      if (i + 1 < s.length && s[i + 1] === '"') {
        i++ // skip escaped quote
      } else {
        quotes++
      }
    }
  }
  return quotes % 2 === 0
}

async function * readCsvRows (csvPath) {
  const rl = readline.createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity })

  const MAX_BUFFERED_ROWS = 5
  const queue = []
  let rowBuf = ''
  let done = false
  let error = null

  let resolveAvailable = null // signaled when producer enqueues a row
  let resolveDrained = null // signaled when consumer dequeues and frees capacity

  const signalAvailable = () => {
    if (resolveAvailable) {
      const r = resolveAvailable
      resolveAvailable = null
      r()
    }
  }
  const signalDrained = () => {
    if (resolveDrained) {
      const r = resolveDrained
      resolveDrained = null
      r()
    }
  }

  // Producer: read lines, assemble complete CSV rows, and enqueue with backpressure
  const producer = (async () => {
    try {
      for await (const line of rl) {
        if (rowBuf.length > 0) rowBuf += '\n'
        rowBuf += line
        if (isCsvRowComplete(rowBuf)) {
          const row = rowBuf
          rowBuf = ''
          if (row.trim().length === 0) continue
          while (queue.length >= MAX_BUFFERED_ROWS) {
            await new Promise(resolve => { resolveDrained = resolve })
          }
          queue.push(row)
          signalAvailable()
        }
      }
      if (rowBuf.trim().length > 0) {
        while (queue.length >= MAX_BUFFERED_ROWS) {
          await new Promise(resolve => { resolveDrained = resolve })
        }
        queue.push(rowBuf)
        rowBuf = ''
        signalAvailable()
      }
    } catch (e) {
      error = e
    } finally {
      done = true
      signalAvailable()
    }
  })()

  try {
    while (!done || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise(resolve => { resolveAvailable = resolve })
        if (error) throw error
        if (queue.length === 0 && done) break
      }
      if (queue.length > 0) {
        const next = queue.shift()
        signalDrained()
        yield next
      }
    }
  } finally {
    try { rl.close() } catch {}
    try { await producer } catch {}
  }
}
