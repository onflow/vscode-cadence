import tm from 'vscode-textmate'
import { loadWASM, OnigScanner, OnigString } from 'onigasm'
import { promises as fs } from 'fs'
import { parentPort, workerData } from 'worker_threads'

const { Registry } = tm

let grammar

async function init () {
  const { wasmPath, grammarPath } = workerData
  const wasmBin = await fs.readFile(wasmPath)
  const wasmBuffer = wasmBin.buffer.slice(
    wasmBin.byteOffset,
    wasmBin.byteOffset + wasmBin.byteLength
  )
  await loadWASM(wasmBuffer)

  const grammarRaw = JSON.parse(await fs.readFile(grammarPath, 'utf8'))
  const registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new OnigScanner(patterns),
      createOnigString: (s) => new OnigString(s)
    }),
    loadGrammar: async () => grammarRaw
  })

  grammar = await registry.loadGrammar('source.cadence')
}

function checkFileForScopeLeaks (content) {
  const lines = content.split('\n')
  let ruleStack = null

  for (let i = 0; i < lines.length; i++) {
    const result = grammar.tokenizeLine(lines[i], ruleStack)
    ruleStack = result.ruleStack
  }

  const eofResult = grammar.tokenizeLine('', ruleStack)
  if (eofResult.tokens.length === 0) return { success: true }

  const leakedScopes = Array.from(new Set(
    eofResult.tokens.flatMap(t => t.scopes.filter(s => s !== 'source.cadence'))
  ))

  if (leakedScopes.length > 0) {
    return { success: false, error: `Leaked scopes at EOF: ${JSON.stringify(leakedScopes)}` }
  }

  return { success: true }
}

function scanScopes (content) {
  const lines = content.split('\n')
  let ruleStack = null
  let beginCount = 0
  let endCount = 0
  const beginLines = []
  const endLines = []
  const lastTokens = []

  for (let i = 0; i < lines.length; i++) {
    const res = grammar.tokenizeLine(lines[i], ruleStack)
    ruleStack = res.ruleStack
    if (res.tokens.some(t => t.scopes.includes('punctuation.section.type.begin.cadence'))) {
      beginCount++
      beginLines.push({ i: i + 1, line: lines[i] })
      if (beginLines.length > 10) beginLines.shift()
    }
    if (res.tokens.some(t => t.scopes.includes('punctuation.section.type.end.cadence'))) {
      endCount++
      endLines.push({ i: i + 1, line: lines[i] })
      if (endLines.length > 10) endLines.shift()
    }
    lastTokens.push(res.tokens.map(t => ({ scopes: t.scopes })))
    if (lastTokens.length > 5) lastTokens.shift()
  }

  const eof = grammar.tokenizeLine('', ruleStack)
  const leakedScopes = Array.from(new Set(
    eof.tokens.flatMap(t => t.scopes.filter(s => s !== 'source.cadence'))
  ))

  return {
    beginCount,
    endCount,
    lastBegins: beginLines,
    lastEnds: endLines,
    lastTokens,
    leakedScopes
  }
}

async function main () {
  await init()
  parentPort.on('message', (msg) => {
    if (!msg) return
    try {
      if (msg.type === 'check') {
        const res = checkFileForScopeLeaks(msg.code)
        parentPort.postMessage({ id: msg.id, result: res })
      } else if (msg.type === 'scan') {
        const res = scanScopes(msg.code)
        parentPort.postMessage({ id: msg.id, result: res })
      }
    } catch (e) {
      parentPort.postMessage({ id: msg.id, result: { success: false, error: `Worker failed: ${e.message}` } })
    }
  })
}

main().catch(err => {
  // Surface init failures to parent
  parentPort.postMessage({ id: 'init', error: err.message })
})


