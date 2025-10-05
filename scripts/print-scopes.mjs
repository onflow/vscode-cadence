/**
 * print-scopes.mjs
 *
 * Utility script for debugging TextMate grammar tokenization.
 * Tokenizes Cadence code lines and prints detailed scope information for each token.
 *
 * Usage:
 *   1. Edit the `lines` array below with the Cadence code you want to analyze
 *   2. Run: node scripts/print-scopes.mjs
 *   3. Output shows each token's text, position, and full scope chain
 *
 * This is useful for:
 *   - Debugging syntax highlighting issues
 *   - Understanding how TextMate rules are applied
 *   - Writing/verifying grammar tests
 */

import fs from 'node:fs/promises'
import tm from 'vscode-textmate'
import { loadWASM, OnigScanner, OnigString } from 'onigasm'
const { Registry } = tm

const readFile = (p) => fs.readFile(new URL(p, new URL('../', import.meta.url)))

async function main () {
  const onigWasmBuf = await readFile('node_modules/onigasm/lib/onigasm.wasm')
  const onigWasm = onigWasmBuf.buffer.slice(onigWasmBuf.byteOffset, onigWasmBuf.byteOffset + onigWasmBuf.byteLength)
  await loadWASM(onigWasm)
  const grammarRaw = JSON.parse((await readFile('extension/language/syntaxes/cadence.tmGrammar.json')).toString())
  const registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new OnigScanner(patterns),
      createOnigString: (s) => new OnigString(s)
    }),
    loadGrammar: async () => grammarRaw
  })
  const grammar = await registry.loadGrammar('source.cadence')

  const lines = [
    '        let threshold = self.getSafeSuccessThreshold()',
    '        return self.borrowSubmissionTracker().submissionExceedsThreshold(threshold)'
  ]

  let ruleStack = null
  lines.forEach((line, i) => {
    const { tokens, ruleStack: next } = grammar.tokenizeLine(line, ruleStack)
    console.log(`LINE ${i + 1}: ${line}`)
    tokens.forEach(t => {
      const text = line.slice(t.startIndex, t.endIndex)
      console.log(JSON.stringify({ range: [t.startIndex, t.endIndex], text, scopes: t.scopes }))
    })
    ruleStack = next
    console.log('')
  })
}

main().catch(err => { console.error(err); process.exit(1) })
