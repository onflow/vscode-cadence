import fs from 'node:fs/promises'
import tm from 'vscode-textmate'
import { loadWASM, OnigScanner, OnigString } from 'onigasm'
import { expect } from 'chai'
const { Registry } = tm

const repoRoot = new URL('../', import.meta.url)
const readFile = (p) => fs.readFile(new URL(p, repoRoot))

describe('Cadence tmGrammar', () => {
  let registry, grammar

  before(async () => {
    const onigWasmBuf = await readFile('node_modules/onigasm/lib/onigasm.wasm')
    const onigWasm = onigWasmBuf.buffer.slice(
      onigWasmBuf.byteOffset,
      onigWasmBuf.byteOffset + onigWasmBuf.byteLength
    )
    await loadWASM(onigWasm)
    const grammarRaw = JSON.parse(
      (await readFile('extension/language/syntaxes/cadence.tmGrammar.json')).toString()
    )
    registry = new Registry({
      onigLib: Promise.resolve({
        createOnigScanner: (patterns) => new OnigScanner(patterns),
        createOnigString: (s) => new OnigString(s)
      }),
      loadGrammar: async () => grammarRaw
    })
    grammar = await registry.loadGrammar('source.cadence')
  })

  // Helper: Get all scopes at a specific character index
  const scopesAt = (line, tokens, charIndex) =>
    tokens
      .filter((t) => t.startIndex <= charIndex && charIndex < t.endIndex)
      .flatMap((t) => t.scopes)

  // Helper: Check if any token contains a scope
  const hasScope = (tokens, scope) => tokens.some(t => t.scopes.includes(scope))

  // Helper: Check if any token contains text matching a predicate
  const hasTextWithScope = (line, tokens, text, scope) =>
    tokens.some(t =>
      t.scopes.includes(scope) &&
      line.slice(t.startIndex, t.endIndex).includes(text)
    )

  describe('Declarations', () => {
    it('highlights unnamed parameters with underscore prefix', () => {
      const line = 'access(all) fun addSubmission(_ nodeID: String, _ submission: ResultSubmission) {'
      const { tokens } = grammar.tokenizeLine(line)

      // Check that _ is marked as unnamed parameter operator
      const underscoreTokens = tokens.filter(t => line.slice(t.startIndex, t.endIndex) === '_')
      expect(underscoreTokens.length).to.equal(2)
      underscoreTokens.forEach(token => {
        expect(token.scopes.includes('keyword.operator.unnamed-parameter.cadence')).to.be.true
      })

      // Check that parameter names are marked as parameters
      for (const paramName of ['nodeID', 'submission']) {
        expect(tokens.some(t =>
          t.scopes.includes('variable.parameter.cadence') &&
          line.slice(t.startIndex, t.endIndex) === paramName
        )).to.be.true
      }

      // Check that type names are marked correctly
      for (const typeName of ['String', 'ResultSubmission']) {
        expect(tokens.some(t =>
          t.scopes.includes('entity.name.type.cadence') &&
          line.slice(t.startIndex, t.endIndex) === typeName
        )).to.be.true
      }
    })

    it('highlights contract declaration and name', () => {
      const line = 'access(all) contract HybridCustody {'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('contract') + 1)).to.include('storage.type.contract.cadence')
      expect(scopesAt(line, tokens, line.indexOf('HybridCustody') + 2)).to.include('entity.name.type.contract.cadence')
      expect(hasScope(tokens, 'punctuation.section.type.begin.cadence')).to.be.true
    })

    it('highlights attachment and enum composites', () => {
      const line1 = 'attachment ExtraData {'
      const { tokens: t1 } = grammar.tokenizeLine(line1)
      expect(scopesAt(line1, t1, line1.indexOf('attachment') + 1)).to.include('storage.type.attachment.cadence')
      expect(scopesAt(line1, t1, line1.indexOf('ExtraData') + 1)).to.include('entity.name.type.attachment.cadence')

      const line2 = 'enum Choice {'
      const { tokens: t2 } = grammar.tokenizeLine(line2)
      expect(scopesAt(line2, t2, line2.indexOf('enum') + 1)).to.include('storage.type.enum.cadence')
      expect(scopesAt(line2, t2, line2.indexOf('Choice') + 1)).to.include('entity.name.type.enum.cadence')
    })

    it('highlights event declaration and name', () => {
      const line = 'access(all) event CounterIncremented(newCount: Int)'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('event') + 1)).to.include('storage.type.event.cadence')
      expect(scopesAt(line, tokens, line.indexOf('CounterIncremented') + 2)).to.include('entity.name.type.event.cadence')
    })

    it('allows doc comments within event parameter lists', () => {
      const l1 = 'access(all) event EpochSetup('
      const l2 = '    /// doc'
      const l3 = ')'
      const r1 = grammar.tokenizeLine(l1)
      const r2 = grammar.tokenizeLine(l2, r1.ruleStack)
      const r3 = grammar.tokenizeLine(l3, r2.ruleStack)
      expect(r2.tokens.some(t => t.scopes.find(s => s.startsWith('comment.')))).to.be.true
      expect(hasScope(r3.tokens, 'punctuation.definition.parameters.end.cadence')).to.be.true
    })

    it('highlights function definition and name', () => {
      const line = 'fun main(param: Int): Int {'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('fun') + 1)).to.include('storage.type.function.cadence')
      expect(scopesAt(line, tokens, line.indexOf('main') + 1)).to.include('entity.name.function.cadence')
    })

    it('tokenizes complete function signature with auth and entitlements', () => {
      const line = 'access(all) fun foo(): Capability<auth(Test) &Foo>'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('access(') + 1)).to.include('storage.modifier.access.cadence')
      expect(scopesAt(line, tokens, line.indexOf(' fun ') + 1)).to.include('storage.type.function.cadence')
      expect(scopesAt(line, tokens, line.indexOf('foo') + 1)).to.include('entity.name.function.cadence')
      expect(scopesAt(line, tokens, line.indexOf(':') + 0)).to.include('keyword.operator.function-result.cadence')
      expect(scopesAt(line, tokens, line.indexOf('Capability') + 1)).to.include('entity.name.type.cadence')
      expect(scopesAt(line, tokens, line.indexOf('<') + 0)).to.include('punctuation.definition.type-arguments.begin.cadence')
      expect(scopesAt(line, tokens, line.indexOf('auth') + 1)).to.include('keyword.other.auth.cadence')
      expect(scopesAt(line, tokens, line.indexOf('Test') + 1)).to.include('entity.name.type.entitlement.cadence')
      expect(scopesAt(line, tokens, line.indexOf('&') + 0)).to.include('punctuation.definition.type.reference.cadence')
    })

    it('tokenizes initializer with labeled parameters and types', () => {
      const line = 'init(canExecuteTransaction: Bool, requiredBalance: UFix64,  maximumTransactionFees: UFix64){'
      const { tokens } = grammar.tokenizeLine(line)

      // init keyword
      expect(tokens.some(t => t.scopes.includes('storage.type.function.cadence') && line.slice(t.startIndex, t.endIndex) === 'init')).to.be.true

      // parameter punctuation in initializer uses parameter clause scopes
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.parameters.begin.cadence') && line.slice(t.startIndex, t.endIndex) === '(')).to.be.true
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.parameters.end.cadence') && line.slice(t.startIndex, t.endIndex) === ')')).to.be.true

      // function body begin for initializer uses function begin punctuation
      expect(tokens.some(t => t.scopes.includes('punctuation.section.function.begin.cadence') && line.slice(t.startIndex, t.endIndex) === '{')).to.be.true

      // Check that parameters are scoped correctly
      for (const paramName of ['canExecuteTransaction', 'requiredBalance', 'maximumTransactionFees']) {
        expect(tokens.some(t =>
          t.scopes.includes('variable.parameter.cadence') &&
          line.slice(t.startIndex, t.endIndex) === paramName
        )).to.be.true
      }
    })

    it('highlights external parameter labels in function definitions', () => {
      const line = 'fun deposit(from vault: @{FungibleToken.Vault}) {'
      const { tokens } = grammar.tokenizeLine(line)

      // 'from' is external label -> entity.name.label.cadence
      expect(tokens.some(t =>
        t.scopes.includes('entity.name.label.cadence') &&
        line.slice(t.startIndex, t.endIndex) === 'from'
      )).to.be.true

      // 'vault' is internal parameter name -> variable.parameter.cadence
      expect(tokens.some(t =>
        t.scopes.includes('variable.parameter.cadence') &&
        line.slice(t.startIndex, t.endIndex) === 'vault'
      )).to.be.true
    })
  })

  describe('Transactions', () => {
    it('highlights transaction header and parameter types', () => {
      const line = 'transaction(amount: UFix64, to: Address, contractName: String) { }'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'storage.type.transaction.cadence')).to.be.true
      expect(hasScope(tokens, 'punctuation.definition.parameters.begin.cadence')).to.be.true
      for (const typeName of ['UFix64', 'Address', 'String']) {
        expect(hasTextWithScope(line, tokens, typeName, 'entity.name.type.cadence')).to.be.true
      }
    })

    it('highlights transaction phase keywords', () => {
      const executeLine = 'execute {'
      const { tokens: executeTokens } = grammar.tokenizeLine(executeLine)
      expect(scopesAt(executeLine, executeTokens, executeLine.indexOf('execute') + 1)).to.include('storage.modifier.phase.cadence')

      const preLine = 'pre {'
      const { tokens: preTokens } = grammar.tokenizeLine(preLine)
      expect(scopesAt(preLine, preTokens, preLine.indexOf('pre') + 1)).to.include('storage.modifier.phase.cadence')

      const postLine = 'post {'
      const { tokens: postTokens } = grammar.tokenizeLine(postLine)
      expect(scopesAt(postLine, postTokens, postLine.indexOf('post') + 1)).to.include('storage.modifier.phase.cadence')
    })

    it('tokenizes prepare phase with auth and entitlements', () => {
      const line = 'prepare(acct: auth(Storage, Capabilities) &Account) { }'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('prepare') + 1)).to.include('storage.modifier.phase.cadence')
      expect(scopesAt(line, tokens, line.indexOf('auth') + 1)).to.include('keyword.other.auth.cadence')
      expect(scopesAt(line, tokens, line.indexOf('Storage') + 1)).to.include('entity.name.type.entitlement.cadence')
      expect(scopesAt(line, tokens, line.indexOf('&') + 0)).to.include('punctuation.definition.type.reference.cadence')
      expect(scopesAt(line, tokens, line.indexOf('{') + 0)).to.include('punctuation.section.phase.begin.cadence')
    })
  })

  describe('Access Control & Entitlements', () => {
    it('highlights access modifier with built-in audiences', () => {
      const audiences = ['all', 'self', 'contract', 'account']
      for (const audience of audiences) {
        const line = `access(${audience}) let x: UInt64`
        const { tokens } = grammar.tokenizeLine(line)
        expect(scopesAt(line, tokens, line.indexOf('access(') + 1)).to.include('storage.modifier.access.cadence')
        expect(hasScope(tokens, 'constant.language.access.audience.cadence')).to.be.true
      }
    })

    it('highlights access modifier with custom entitlements', () => {
      const line = 'access(Manage) fun addOwnedAccount()'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('access(') + 1)).to.include('storage.modifier.access.cadence')
      expect(scopesAt(line, tokens, line.indexOf('Manage') + 1)).to.include('entity.name.type.entitlement.cadence')
    })

    it('highlights access with multiple entitlements and separators', () => {
      const line = 'access(Foo.Bar | Foo.Bar2, Baz.Qux)'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('Foo.Bar') + 1)).to.include('entity.name.type.entitlement.cadence')
      expect(scopesAt(line, tokens, line.indexOf('Foo.Bar2') + 1)).to.include('entity.name.type.entitlement.cadence')
      expect(scopesAt(line, tokens, line.indexOf('Baz.Qux') + 1)).to.include('entity.name.type.entitlement.cadence')
      expect(scopesAt(line, tokens, line.indexOf('|') + 0)).to.include('punctuation.separator.entitlement.cadence')
      expect(scopesAt(line, tokens, line.indexOf(',') + 0)).to.include('punctuation.separator.entitlement.cadence')
    })

    it('highlights entitlement mapping in access modifier', () => {
      const line = 'access(mapping OuterToInnerMap) let child: @InnerResource'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('mapping') + 1)).to.include('keyword.other.mapping.cadence')
      expect(scopesAt(line, tokens, line.indexOf('OuterToInnerMap') + 2)).to.include('entity.name.type.entitlement-mapping.cadence')
    })

    it('highlights entitlement declaration', () => {
      const line = 'access(all) entitlement Owner'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('entitlement') + 2)).to.include('keyword.declaration.entitlement.cadence')
      expect(scopesAt(line, tokens, line.indexOf('Owner') + 1)).to.include('entity.name.type.entitlement.cadence')
    })

    it('tokenizes entitlement mapping declaration with include and arrows', () => {
      const header = 'entitlement mapping CapabilitiesMapping {'
      const body1 = '    include Identity'
      const body2 = '    StorageCapabilities -> GetStorageCapabilityController'
      const footer = '}'

      const r0 = grammar.tokenizeLine(header)
      expect(scopesAt(header, r0.tokens, header.indexOf('entitlement') + 1)).to.include('keyword.declaration.entitlement.cadence')
      expect(scopesAt(header, r0.tokens, header.indexOf('mapping') + 1)).to.include('keyword.other.mapping.cadence')
      expect(scopesAt(header, r0.tokens, header.indexOf('CapabilitiesMapping') + 1)).to.include('entity.name.type.entitlement-mapping.cadence')

      const r1 = grammar.tokenizeLine(body1, r0.ruleStack)
      expect(hasScope(r1.tokens, 'keyword.other.mapping.include.cadence')).to.be.true
      expect(hasScope(r1.tokens, 'entity.name.type.entitlement-mapping.cadence')).to.be.true

      const r2 = grammar.tokenizeLine(body2, r1.ruleStack)
      expect(hasScope(r2.tokens, 'entity.name.type.entitlement.cadence')).to.be.true
      expect(hasScope(r2.tokens, 'punctuation.separator.mapping.cadence')).to.be.true

      const r3 = grammar.tokenizeLine(footer, r2.ruleStack)
      expect(hasScope(r3.tokens, 'punctuation.definition.type.end.cadence')).to.be.true
    })

    it('handles entitlement mapping keywords with varied whitespace', () => {
      // Test "mapping" keyword with multiple spaces/tabs
      const line1 = 'access(mapping  MyMap) let x: Int'  // double space
      const { tokens: t1 } = grammar.tokenizeLine(line1)
      expect(hasScope(t1, 'keyword.other.mapping.cadence')).to.be.true
      expect(hasScope(t1, 'entity.name.type.entitlement-mapping.cadence')).to.be.true

      // Test "include" keyword with multiple spaces/tabs
      const header = 'entitlement mapping TestMap {'
      const body = '    include  Identity'  // double space
      const r0 = grammar.tokenizeLine(header)
      const r1 = grammar.tokenizeLine(body, r0.ruleStack)
      expect(hasScope(r1.tokens, 'keyword.other.mapping.include.cadence')).to.be.true
      expect(hasScope(r1.tokens, 'entity.name.type.entitlement-mapping.cadence')).to.be.true
    })

    it('highlights view modifier', () => {
      const line = 'view fun getCount(): Int'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('view') + 1)).to.include('storage.modifier.view.cadence')
    })
  })

  describe('Types', () => {
    it('highlights dictionary types with proper punctuation', () => {
      const line = 'let dkgIdMapping: {String: Int}'
      const { tokens } = grammar.tokenizeLine(line)
      
      // Dictionary braces
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.dictionary.begin.cadence'))).to.be.true
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.dictionary.end.cadence'))).to.be.true
      
      // Colon separator inside dictionary
      expect(tokens.some(t => 
        t.scopes.includes('punctuation.separator.type.dictionary.cadence') &&
        line.slice(t.startIndex, t.endIndex) === ':'
      )).to.be.true
      
      // Type names
      expect(tokens.some(t => 
        t.scopes.includes('entity.name.type.cadence') &&
        line.slice(t.startIndex, t.endIndex) === 'String'
      )).to.be.true
      expect(tokens.some(t => 
        t.scopes.includes('entity.name.type.cadence') &&
        line.slice(t.startIndex, t.endIndex) === 'Int'
      )).to.be.true
    })

    it('highlights array types with proper punctuation', () => {
      const line = 'let items: [String]'
      const { tokens } = grammar.tokenizeLine(line)
      
      // Array brackets
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.array.begin.cadence'))).to.be.true
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.array.end.cadence'))).to.be.true
      
      // Type name
      expect(tokens.some(t => 
        t.scopes.includes('entity.name.type.cadence') &&
        line.slice(t.startIndex, t.endIndex) === 'String'
      )).to.be.true
    })

    it('highlights nested dictionary and array types', () => {
      const line = 'let data: {String: [Int?]}'
      const { tokens } = grammar.tokenizeLine(line)
      
      // Dictionary punctuation
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.dictionary.begin.cadence'))).to.be.true
      expect(tokens.some(t => t.scopes.includes('punctuation.separator.type.dictionary.cadence'))).to.be.true
      
      // Array punctuation
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.array.begin.cadence'))).to.be.true
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.array.end.cadence'))).to.be.true
      
      // Optional type
      expect(tokens.some(t => 
        t.scopes.includes('keyword.operator.type.optional.cadence') &&
        line.slice(t.startIndex, t.endIndex) === '?'
      )).to.be.true
    })

    it('handles dictionaries with varied whitespace', () => {
      const variations = [
        'let x:{String:Int}',          // no spaces
        'let x: {String: Int}',        // normal spaces
        'let x: { String : Int }',     // extra spaces
      ]
      
      variations.forEach(line => {
        const { tokens } = grammar.tokenizeLine(line)
        expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.dictionary.begin.cadence')), 
          `Failed for: ${line}`).to.be.true
        expect(tokens.some(t => t.scopes.includes('punctuation.separator.type.dictionary.cadence')),
          `Failed for: ${line}`).to.be.true
        expect(tokens.some(t => t.scopes.includes('entity.name.type.cadence') && 
          line.slice(t.startIndex, t.endIndex) === 'String'),
          `Failed for: ${line}`).to.be.true
      })
    })

    it('handles arrays with varied whitespace', () => {
      const variations = [
        'let x:[String]',               // no space
        'let x: [String]',              // normal space
        'let x : [ String ]',           // extra spaces
      ]
      
      variations.forEach(line => {
        const { tokens } = grammar.tokenizeLine(line)
        expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.array.begin.cadence')),
          `Failed for: ${line}`).to.be.true
        expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.array.end.cadence')),
          `Failed for: ${line}`).to.be.true
      })
    })

    it('handles reference types with varied whitespace', () => {
      const variations = [
        'let x: &Account',              // normal
        'let x:&Account',               // no space before &
        'let x: & Account',             // space after &
        'let x: @MyResource',           // @ reference
        'let x:@ MyResource',           // @ with space after
      ]
      
      variations.forEach(line => {
        const { tokens } = grammar.tokenizeLine(line)
        expect(tokens.some(t => t.scopes.includes('punctuation.definition.type.reference.cadence')),
          `Failed for: ${line}`).to.be.true
        expect(tokens.some(t => t.scopes.includes('entity.name.type.cadence')),
          `Failed for: ${line}`).to.be.true
      })
    })

    it('handles deeply nested type structures', () => {
      const testCases = [
        {
          desc: 'nested dictionaries',
          line: 'let x: {String: {Int: Bool}}',
          expectedScopes: ['punctuation.definition.type.dictionary.begin.cadence'],
          expectedTypes: ['String', 'Int', 'Bool']
        },
        {
          desc: 'dictionary with array value',
          line: 'let x: {String: [Int]}',
          expectedScopes: [
            'punctuation.definition.type.dictionary.begin.cadence',
            'punctuation.definition.type.array.begin.cadence'
          ],
          expectedTypes: ['String', 'Int']
        },
        {
          desc: 'array of dictionaries',
          line: 'let x: [{String: Int}]',
          expectedScopes: [
            'punctuation.definition.type.array.begin.cadence',
            'punctuation.definition.type.dictionary.begin.cadence'
          ],
          expectedTypes: ['String', 'Int']
        },
        {
          desc: 'nested arrays',
          line: 'let x: [[Int]]',
          expectedScopes: ['punctuation.definition.type.array.begin.cadence'],
          expectedTypes: ['Int']
        },
        {
          desc: 'generic type with nested generic',
          line: 'let x: Capability<&{Interface}>',
          expectedScopes: [
            'punctuation.definition.type-arguments.begin.cadence',
            'punctuation.definition.type.reference.cadence'
          ],
          expectedTypes: ['Capability', 'Interface']
        },
        {
          desc: 'complex nesting with optionals',
          line: 'let x: {String: [Capability<&Resource>?]}?',
          expectedScopes: [
            'punctuation.definition.type.dictionary.begin.cadence',
            'punctuation.definition.type.array.begin.cadence',
            'punctuation.definition.type-arguments.begin.cadence',
            'keyword.operator.type.optional.cadence'
          ],
          expectedTypes: ['String', 'Capability', 'Resource']
        },
        {
          desc: 'dictionary with auth reference value',
          line: 'let x: {String: auth(Owner) &Account}',
          expectedScopes: [
            'punctuation.definition.type.dictionary.begin.cadence',
            'keyword.other.auth.cadence',
            'punctuation.definition.type.reference.cadence'
          ],
          expectedTypes: ['String', 'Account']
        }
      ]

      testCases.forEach(({ desc, line, expectedScopes, expectedTypes }) => {
        const { tokens } = grammar.tokenizeLine(line)
        
        // Check expected punctuation/keywords
        expectedScopes.forEach(scope => {
          expect(tokens.some(t => t.scopes.includes(scope)),
            `${desc}: Missing scope "${scope}" in "${line}"`).to.be.true
        })
        
        // Check expected type names
        expectedTypes.forEach(typeName => {
          expect(tokens.some(t => 
            t.scopes.includes('entity.name.type.cadence') && 
            line.slice(t.startIndex, t.endIndex) === typeName
          ), `${desc}: Missing type "${typeName}" in "${line}"`).to.be.true
        })
      })

      // Separately verify entitlements are properly scoped in auth contexts
      const authLine = 'let x: {String: auth(Owner) &Account}'
      const { tokens: authTokens } = grammar.tokenizeLine(authLine)
      expect(authTokens.some(t => 
        t.scopes.includes('entity.name.type.entitlement.cadence') &&
        authLine.slice(t.startIndex, t.endIndex) === 'Owner'
      ), 'Entitlement "Owner" should be scoped as entity.name.type.entitlement.cadence').to.be.true
    })

    it('handles array and dictionary separators in nested contexts', () => {
      // Array with multiple elements
      const line1 = 'let x: [String, Int, Bool]'
      const { tokens: t1 } = grammar.tokenizeLine(line1)
      expect(t1.some(t => t.scopes.includes('punctuation.definition.type.array.begin.cadence'))).to.be.true
      
      // Dictionary with multiple entries - not valid in Cadence, but testing the comma separator
      const line2 = 'let x: {String: Int}'
      const { tokens: t2 } = grammar.tokenizeLine(line2)
      const colonToken = t2.find(t => 
        line2.slice(t.startIndex, t.endIndex) === ':' &&
        t.scopes.includes('punctuation.separator.type.dictionary.cadence')
      )
      expect(colonToken).to.not.be.undefined
    })

    it('distinguishes between reference to dictionary and intersection types', () => {
      // Reference to dictionary - should be dictionary type
      const dictLine = 'let x: &{String: Int}'
      const { tokens: dictTokens } = grammar.tokenizeLine(dictLine)
      expect(dictTokens.some(t => t.scopes.includes('punctuation.definition.type.reference.cadence'))).to.be.true
      expect(dictTokens.some(t => t.scopes.includes('punctuation.definition.type.dictionary.begin.cadence'))).to.be.true
      const colonToken = dictTokens.find(t => 
        dictLine.slice(t.startIndex, t.endIndex) === ':' &&
        t.scopes.includes('punctuation.separator.type.dictionary.cadence')
      )
      expect(colonToken, 'Colon should be scoped as dictionary separator').to.not.be.undefined

      // Intersection type - should NOT be dictionary
      const intersectionLine = 'let x: &{Interface}'
      const { tokens: intersectionTokens } = grammar.tokenizeLine(intersectionLine)
      expect(intersectionTokens.some(t => t.scopes.includes('punctuation.definition.type.reference.cadence'))).to.be.true
      expect(intersectionTokens.some(t => t.scopes.includes('punctuation.definition.type.intersection.begin.cadence'))).to.be.true
      expect(intersectionTokens.some(t => t.scopes.includes('punctuation.definition.type.dictionary.begin.cadence'))).to.be.false

      // Reference to dictionary in generic context
      const genericLine = 'test<&{UInt64: String}>()'
      const { tokens: genericTokens } = grammar.tokenizeLine(genericLine)
      expect(genericTokens.some(t => t.scopes.includes('punctuation.separator.type.dictionary.cadence'))).to.be.true
    })

    it('highlights auth keyword in type contexts', () => {
      const line = 'prepare(account: auth(FungibleToken.Withdraw) &{FungibleToken.Provider}) {'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('auth') + 1)).to.include('keyword.other.auth.cadence')
    })

    it('highlights auth with multiple entitlements in type arguments', () => {
      const line = 'let t: Capability<auth(Storage, Contracts, Keys) &{AccountPrivate}>'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('auth') + 1)).to.include('keyword.other.auth.cadence')
      expect(scopesAt(line, tokens, line.indexOf('Keys') + 1)).to.include('entity.name.type.entitlement.cadence')
    })

    it('highlights intersection types with dotted names and commas', () => {
      const line = 'let x: &{AccountPrivate, AccountPublic, ViewResolver.Resolver}'
      const { tokens } = grammar.tokenizeLine(line)
      const commaIdx = line.indexOf(', ')
      expect(scopesAt(line, tokens, commaIdx)).to.include('punctuation.separator.type.intersection.cadence')
      const dottedIdx = line.indexOf('ViewResolver.Resolver') + 5
      expect(scopesAt(line, tokens, dottedIdx)).to.include('entity.name.type.cadence')
    })

    it('highlights type arguments punctuation', () => {
      const line = 'let c: Capability<auth(Execute) &{TransactionHandler}>'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('<') + 0)).to.include('punctuation.definition.type-arguments.begin.cadence')
      expect(scopesAt(line, tokens, line.lastIndexOf('>') - 0)).to.include('punctuation.definition.type-arguments.end.cadence')
    })

    it('highlights reference punctuation', () => {
      const line = 'let x: &Account'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('&') + 0)).to.include('punctuation.definition.type.reference.cadence')
    })

    it('highlights casting operators', () => {
      const operators = [
        { op: 'as?', line: 'let x = y as? String' },
        { op: 'as!', line: 'let x = y as! String' },
        { op: 'as', line: 'let x = y as String' }
      ]
      for (const { op, line } of operators) {
        const { tokens } = grammar.tokenizeLine(line)
        expect(scopesAt(line, tokens, line.indexOf(op) + 1)).to.include('keyword.operator.type.cast.cadence')
      }
    })

    it('highlights closure function types', () => {
      const line = 'let f: fun(Int): Int = fun (_: Int): Int { return 1 }'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'storage.type.function.cadence')).to.be.true
      expect(hasScope(tokens, 'keyword.operator.function-result.cadence')).to.be.true
    })

    it('highlights nested function type return values', () => {
      const line = 'fun makeCounter(): fun(): Int { return fun(): Int { return 1 } }'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'keyword.operator.function-result.cadence')).to.be.true
      expect(tokens.filter(t => t.scopes.includes('storage.type.function.cadence')).length).to.be.greaterThan(1)
    })
  })

  describe('Expressions', () => {
    it('highlights anonymous function expressions', () => {
      const line = 'let test2 = fun(): Void { }'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'storage.type.function.cadence')).to.be.true
      expect(hasScope(tokens, 'keyword.operator.function-result.cadence')).to.be.true
    })

    it('highlights function calls with generic type arguments', () => {
      const line = 'get<&{HybridCustody.ManagerPublic}>(path)'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('<') + 0)).to.include('punctuation.definition.type-arguments.begin.cadence')
      expect(scopesAt(line, tokens, line.indexOf('>') + 0)).to.include('punctuation.definition.type-arguments.end.cadence')
    })

    it('parses auth and reference types in generic call-site arguments', () => {
      const line = 'f<auth(E) &R>()'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'keyword.other.auth.cadence')).to.be.true
      expect(hasScope(tokens, 'punctuation.definition.type.reference.cadence')).to.be.true
      expect(hasScope(tokens, 'entity.name.type.cadence')).to.be.true
    })

    it('highlights labeled arguments after generic type arguments', () => {
      const line = 'acct.storage.borrow<auth(Owner) &Account>(from: storagePath)'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'punctuation.separator.argument-label.cadence')).to.be.true
    })

    it('parses chained member calls with generic type arguments', () => {
      const line = 'f().x<&A>()'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'entity.name.function.cadence')).to.be.true
      expect(hasScope(tokens, 'punctuation.definition.type-arguments.begin.cadence')).to.be.true
    })

    it('detects dotted function calls with labeled arguments', () => {
      const line1 = 'self.emitEpochRecoverEvent('
      const line2 = '    epochCounter: recoveryEpochCounter,'
      const line3 = ')'
      const r1 = grammar.tokenizeLine(line1)
      expect(hasScope(r1.tokens, 'entity.name.function.cadence')).to.be.true
      const r2 = grammar.tokenizeLine(line2, r1.ruleStack)
      expect(hasScope(r2.tokens, 'punctuation.separator.argument-label.cadence')).to.be.true

      // Check that the argument label is scoped correctly
      expect(r2.tokens.some(t =>
        t.scopes.includes('entity.name.label.cadence') &&
        line2.slice(t.startIndex, t.endIndex) === 'epochCounter'
      )).to.be.true

      const r3 = grammar.tokenizeLine(line3, r2.ruleStack)
      expect(hasScope(r3.tokens, 'punctuation.definition.arguments.end.cadence')).to.be.true
    })

    it('highlights optional chaining operator', () => {
      const line = 'let x = obj?.field'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'keyword.operator.optional.chain.cadence')).to.be.true
    })

    it('highlights swap operator', () => {
      const line = 'x <-> y'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'keyword.operator.swap.cadence')).to.be.true
    })

    it('highlights string interpolation with nested parentheses', () => {
      const line = 'let foo = "test \\((self.x / 4) * self.y\\)"'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'string.quoted.double.single-line.cadence')).to.be.true
      expect(hasScope(tokens, 'punctuation.section.embedded.begin.cadence')).to.be.true
      expect(hasScope(tokens, 'punctuation.section.embedded.end.cadence')).to.be.true
      expect(hasScope(tokens, 'meta.interpolation.cadence')).to.be.true
      expect(hasScope(tokens, 'meta.embedded.line.cadence')).to.be.true
      expect(hasScope(tokens, 'variable.language.cadence')).to.be.true
      expect(hasScope(tokens, 'variable.other.member.cadence')).to.be.true
    })

    it('does not treat plain parentheses in strings as interpolation', () => {
      const line = '"The ID of the withdrawn NFT ( must not trigger )"'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'string.quoted.double.single-line.cadence')).to.be.true
      expect(hasScope(tokens, 'punctuation.section.embedded.begin.cadence')).to.be.false
    })
  })

  describe('Keywords & Imports', () => {
    it('highlights import keyword', () => {
      const line = 'import "FungibleToken"'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('import') + 1)).to.include('keyword.control.import.cadence')
    })

    it('highlights identifier imports as variables', () => {
      const line = 'import Crypto'
      const { tokens } = grammar.tokenizeLine(line)
      expect(scopesAt(line, tokens, line.indexOf('import') + 1)).to.include('keyword.control.import.cadence')
      expect(scopesAt(line, tokens, line.indexOf('Crypto') + 1)).to.include('variable.other.readwrite.cadence')
    })

    it("allows 'from' as a variable name outside import statements", () => {
      const line = 'let from <- from as! @FlowToken.Vault'
      const { tokens } = grammar.tokenizeLine(line)

      // The second 'from' (after <-) should be a variable
      const fromTokens = tokens.filter(t => line.slice(t.startIndex, t.endIndex).trim() === 'from')
      expect(fromTokens.length).to.be.greaterThan(1)
      expect(fromTokens.some(t => t.scopes.includes('variable.other.readwrite.cadence'))).to.be.true
    })
  })

  describe('Variable Declarations & Comments', () => {
    it('allows inline trailing comments after type annotation', () => {
      const line1 = 'access(account) var finalSubmissionByNodeID: String // abc'
      const line2 = 'access(account) var uniqueFinalSubmissions: String'
      const r1 = grammar.tokenizeLine(line1)
      const r2 = grammar.tokenizeLine(line2)
      expect(hasScope(r1.tokens, 'storage.modifier.access.cadence')).to.be.true
      expect(hasScope(r1.tokens, 'entity.name.type.cadence')).to.be.true
      expect(r1.tokens.some(t => t.scopes.find(s => s.startsWith('comment.')))).to.be.true
      expect(r2.tokens.length > 0).to.be.true
    })

    it('ends type annotation at line comment start', () => {
      const line1 = 'access(account) var finalSubmissionByNodeID: String //'
      const line2 = 'access(account) var uniqueFinalSubmissions: String'
      const r1 = grammar.tokenizeLine(line1)
      const r2 = grammar.tokenizeLine(line2)
      expect(r1.tokens.some(t => t.scopes.find(s => s.startsWith('comment.')))).to.be.true
      const leaked = r2.tokens.some(t => t.scopes.includes('comment.') || t.scopes.includes('meta.type.cadence'))
      expect(leaked).to.be.false
      expect(hasScope(r2.tokens, 'entity.name.type.cadence')).to.be.true
    })

    it('does not leak type scope across lines with trailing comments (let)', () => {
      const line1 = 'access(all) let a: Int //'
      const line2 = 'access(all) let b: Int'
      const r1 = grammar.tokenizeLine(line1)
      const r2 = grammar.tokenizeLine(line2)
      expect(r1.tokens.some(t => t.scopes.find(s => s.startsWith('comment.')))).to.be.true
      expect(r2.tokens.some(t => t.scopes.find(s => s.startsWith('comment.')))).to.be.false
      expect(hasTextWithScope(line2, r2.tokens, 'Int', 'entity.name.type.cadence')).to.be.true
    })

    it('does not leak type scope across lines with trailing comments (var)', () => {
      const line1 = 'access(all) var a: Int // Test Comment'
      const line2 = 'access(all) var b: Int'
      const r1 = grammar.tokenizeLine(line1)
      const r2 = grammar.tokenizeLine(line2, r1.ruleStack)
      const varIdx = line2.indexOf('var') + 1
      const scopes = scopesAt(line2, r2.tokens, varIdx)
      expect(scopes.includes('entity.name.type.cadence')).to.be.false
      expect(hasTextWithScope(line2, r2.tokens, 'Int', 'entity.name.type.cadence')).to.be.true
    })

    it('restores normal scopes on next line after trailing comment', () => {
      const line1 = 'access(all) var a: Int // Test Comment'
      const line2 = 'access(all) var b: Int'
      const r1 = grammar.tokenizeLine(line1)
      const r2 = grammar.tokenizeLine(line2, r1.ruleStack)
      expect(hasScope(r2.tokens, 'storage.modifier.access.cadence')).to.be.true
      const varIdx = line2.indexOf('var') + 1
      const varScopes = scopesAt(line2, r2.tokens, varIdx)
      expect(varScopes.some(s => s.startsWith('storage.type.'))).to.be.true
    })

    it('does not break with trailing comments on complex var types', () => {
      const l1 = 'access(account) var finalSubmissionByNodeID: {String: [String?]} // deprecated'
      const l2 = 'access(account) var uniqueFinalSubmissions: [[String?]]          // deprecated'
      const r1 = grammar.tokenizeLine(l1)
      const r2 = grammar.tokenizeLine(l2, r1.ruleStack)
      expect(r1.tokens.some(t => t.scopes.find(s => s.startsWith('comment.')))).to.be.true
      expect(hasScope(r2.tokens, 'storage.modifier.access.cadence')).to.be.true
      expect(hasScope(r2.tokens, 'storage.type.var.cadence')).to.be.true
      expect(r2.tokens.some(t => t.scopes.find(s => s.startsWith('comment.')))).to.be.true
    })
  })

  describe('Scope Boundaries', () => {
    it('uses type section punctuation for contract braces', () => {
      const line1 = 'access(all) contract Counter {'
      const line2 = '}'
      const r1 = grammar.tokenizeLine(line1)
      const r2 = grammar.tokenizeLine(line2, r1.ruleStack)
      expect(hasScope(r1.tokens, 'punctuation.section.type.begin.cadence')).to.be.true
      expect(hasScope(r2.tokens, 'punctuation.section.type.end.cadence')).to.be.true
    })

    it('does not color inner braces as type punctuation in nested closures', () => {
      const line1 = 'let test2 = fun(): Void {'
      const line2 = '    let test3 = fun(): Void {'
      const line3 = '    }'
      const line4 = '}'
      const r0 = grammar.tokenizeLine(line1)
      const r1 = grammar.tokenizeLine(line2, r0.ruleStack)
      const r2 = grammar.tokenizeLine(line3, r1.ruleStack)
      const r3 = grammar.tokenizeLine(line4, r2.ruleStack)
      expect(hasScope(r1.tokens, 'punctuation.section.function.begin.cadence')).to.be.true
      expect(hasScope(r2.tokens, 'punctuation.section.function.end.cadence')).to.be.true
      expect(hasScope(r2.tokens, 'punctuation.definition.type.begin.cadence')).to.be.false
      expect(hasScope(r2.tokens, 'punctuation.definition.type.end.cadence')).to.be.false
    })
  })

  describe('Chained Method Calls', () => {
    it('highlights self and chained methods correctly in self.a().b()', () => {
      const line1 = 'access(all) fun dkgCompleted() {'
      const line2 = '    return self.a().b()'
      const r1 = grammar.tokenizeLine(line1)
      const r2 = grammar.tokenizeLine(line2, r1.ruleStack)
      // Check that 'self' is highlighted
      expect(hasScope(r2.tokens, 'variable.language.cadence')).to.be.true
      // Check that both 'a' and 'b' are recognized as methods
      const methodTokens = r2.tokens.filter(t => t.scopes.includes('entity.name.function.cadence'))
      expect(methodTokens.length).to.be.at.least(2)
      // Check that both method calls have proper argument parentheses
      const argBegins = r2.tokens.filter(t => t.scopes.includes('punctuation.definition.arguments.begin.cadence'))
      expect(argBegins.length).to.equal(2)
    })
  })

  describe('Member Access Highlighting', () => {
    it('highlights methods vs member variables correctly', () => {
      const line = 'self.address().balance().attoflow'
      const { tokens } = grammar.tokenizeLine(line)
      // methods
      for (const name of ['address', 'balance']) {
        expect(tokens.some(t => t.scopes.includes('entity.name.function.cadence') && line.slice(t.startIndex, t.endIndex) === name)).to.be.true
      }
      // property
      expect(tokens.some(t => t.scopes.includes('variable.other.member.cadence') && line.slice(t.startIndex, t.endIndex) === 'attoflow')).to.be.true
    })

    it('highlights deep dotted access from sample', () => {
      const line = 'emit FLOWTokensDeposited(address: self.address().toString(), amount: amount, depositedUUID: depositedUUID, balanceAfterInAttoFlow: self.balance().attoflow)'
      const { tokens } = grammar.tokenizeLine(line)
      // methods
      for (const name of ['address', 'toString', 'balance']) {
        expect(tokens.some(t => t.scopes.includes('entity.name.function.cadence') && line.slice(t.startIndex, t.endIndex) === name)).to.be.true
      }
      // property
      expect(tokens.some(t => t.scopes.includes('variable.other.member.cadence') && line.slice(t.startIndex, t.endIndex) === 'attoflow')).to.be.true
      // standalone variables
      for (const name of ['amount', 'depositedUUID']) {
        expect(tokens.some(t => t.scopes.includes('variable.other.readwrite.cadence') && line.slice(t.startIndex, t.endIndex) === name)).to.be.true
      }
    })

    it('does not mark generic callee identifier before < as member', () => {
      const line = 'get<&{HybridCustody.ManagerPublic}>(path)'
      const { tokens } = grammar.tokenizeLine(line)
      // ensure the callee 'get' is not a member
      const getToken = tokens.find(t => line.slice(t.startIndex, t.endIndex) === 'get')
      expect(getToken?.scopes.includes('variable.other.member.cadence')).to.not.equal(true)
    })

    it('highlights top-level variables in chained expressions', () => {
      const line = 'FlowEpoch.configurableMetadata.setNumViewsInEpoch(newEpochViews)'
      const { tokens } = grammar.tokenizeLine(line)
      // top-level variable
      expect(tokens.some(t => t.scopes.includes('variable.other.readwrite.cadence') && line.slice(t.startIndex, t.endIndex) === 'FlowEpoch')).to.be.true
      // member
      expect(tokens.some(t => t.scopes.includes('variable.other.member.cadence') && line.slice(t.startIndex, t.endIndex) === 'configurableMetadata')).to.be.true
      // method
      expect(tokens.some(t => t.scopes.includes('entity.name.function.cadence') && line.slice(t.startIndex, t.endIndex) === 'setNumViewsInEpoch')).to.be.true
      // function argument variable
      expect(tokens.some(t => t.scopes.includes('variable.other.readwrite.cadence') && line.slice(t.startIndex, t.endIndex) === 'newEpochViews')).to.be.true
    })

    it('highlights generic method calls with nested type arguments', () => {
      const line = 'self.account.storage.save<Capability<&FlowDKG.Admin>>(dkgAdminCapability, to: /storage/flowDKGAdminEpochOperations)'
      const { tokens } = grammar.tokenizeLine(line)
      // self
      expect(tokens.some(t => t.scopes.includes('variable.language.cadence') && line.slice(t.startIndex, t.endIndex) === 'self')).to.be.true
      // members
      for (const member of ['account', 'storage']) {
        expect(tokens.some(t => t.scopes.includes('variable.other.member.cadence') && line.slice(t.startIndex, t.endIndex) === member)).to.be.true
      }
      // generic method
      expect(tokens.some(t => t.scopes.includes('entity.name.function.cadence') && line.slice(t.startIndex, t.endIndex) === 'save')).to.be.true
      // generic type argument punctuation
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.type-arguments.begin.cadence'))).to.be.true
      expect(tokens.some(t => t.scopes.includes('punctuation.definition.type-arguments.end.cadence'))).to.be.true
      // function argument variable
      expect(tokens.some(t => t.scopes.includes('variable.other.readwrite.cadence') && line.slice(t.startIndex, t.endIndex) === 'dkgAdminCapability')).to.be.true
    })

    it('does not confuse comparison operators in while loops with generic type arguments', () => {
      const line = '            while index < self.delegators.length {'
      const { tokens } = grammar.tokenizeLine(line)

      // Should NOT have meta.type.arguments scope
      const hasMetaTypeArgs = tokens.some(t => t.scopes.includes('meta.type.arguments.cadence'))
      expect(hasMetaTypeArgs).to.be.false

      // The < should be a comparison operator
      expect(tokens.some(t => t.scopes.includes('keyword.operator.comparison.cadence'))).to.be.true

      // index and length should be variables
      expect(tokens.some(t => t.scopes.includes('variable.other.readwrite.cadence') && line.slice(t.startIndex, t.endIndex) === 'index')).to.be.true
      expect(tokens.some(t => t.scopes.includes('variable.other.member.cadence') && line.slice(t.startIndex, t.endIndex) === 'length')).to.be.true
    })
  })

  describe('Path Literals', () => {
    it('highlights storage paths with domain and identifier', () => {
      const line = 'self.account.storage.save(resource, to: /storage/myResource)'
      const { tokens } = grammar.tokenizeLine(line)

      // Path content (everything after initial /)
      expect(tokens.some(t => t.scopes.includes('constant.other.path.cadence') && line.slice(t.startIndex, t.endIndex) === 'storage/myResource')).to.be.true
    })

    it('highlights public paths', () => {
      const line = 'capability.publish(cap, at: /public/NFTCollection)'
      const { tokens } = grammar.tokenizeLine(line)

      expect(tokens.some(t => t.scopes.includes('constant.other.path.cadence') && line.slice(t.startIndex, t.endIndex) === 'public/NFTCollection')).to.be.true
    })
  })

  describe('Cast Operators and Type Scope', () => {
    it('parses types after cast and highlights auth/reference/type', () => {
      const line = 'x as auth(FungibleToken.Withdraw) &NodeRecord'
      const { tokens } = grammar.tokenizeLine(line)
      expect(hasScope(tokens, 'keyword.operator.type.cast.cadence')).to.be.true
      expect(hasScope(tokens, 'keyword.other.auth.cadence')).to.be.true
      expect(hasScope(tokens, 'punctuation.definition.type.reference.cadence')).to.be.true
      expect(hasScope(tokens, 'entity.name.type.cadence')).to.be.true
    })

    it('treats ! after optional as force-unwrap, not logical not', () => {
      const line = '(x as &NodeRecord?)!'
      const { tokens } = grammar.tokenizeLine(line)
      const textOf = (t) => line.slice(t.startIndex, t.endIndex)
      const bang = tokens.find(t => textOf(t) === '!')
      expect(bang).to.not.equal(undefined)
      expect(bang.scopes).to.include('keyword.operator.force-unwrap.cadence')
    })
    it('highlights return keyword and cast operator', () => {
      const line = 'return (&FlowIDTableStaking.nodes[nodeID] as auth(FungibleToken.Withdraw) &NodeRecord?)!'
      const { tokens } = grammar.tokenizeLine(line)

      // return keyword
      expect(tokens.some(t => t.scopes.includes('keyword.control.transfer.cadence') && line.slice(t.startIndex, t.endIndex) === 'return')).to.be.true

      // as cast operator
      expect(tokens.some(t => t.scopes.includes('keyword.operator.type.cast.cadence') && line.slice(t.startIndex, t.endIndex) === 'as')).to.be.true
    })

    it('does not confuse move operator <- with generic type argument <', () => {
      const line1 = 'self.tokensCommitted <- tokensCommitted as! @FlowToken.Vault'
      const line2 = 'self.tokensStaked <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>()) as! @FlowToken.Vault'

      const r1 = grammar.tokenizeLine(line1)
      const r2 = grammar.tokenizeLine(line2, r1.ruleStack)

      // Check that line 1 has the cast operator
      expect(hasScope(r1.tokens, 'keyword.operator.type.cast.cadence')).to.be.true
      expect(hasScope(r1.tokens, 'keyword.operator.move.cadence')).to.be.true

      // Check that line 2 starts fresh - self should be a language variable
      const selfToken = r2.tokens.find(t => line2.substring(t.startIndex, t.endIndex).trim() === 'self')
      expect(!!selfToken).to.equal(true)
      expect(selfToken && selfToken.scopes.includes('variable.language.cadence')).to.equal(true)

      // Check that tokensStaked is detected as a member (may be split across tokens due to tokenizer limitations)
      const hasMember = r2.tokens.some(t => t.scopes.includes('variable.other.member.cadence') && line2.slice(t.startIndex, t.endIndex).startsWith('tokensStake'))
      expect(hasMember).to.equal(true)
      const misclassifiedAsMethod = r2.tokens.some(t => t.scopes.includes('entity.name.function.cadence') && line2.slice(t.startIndex, t.endIndex).startsWith('tokensStake'))
      expect(misclassifiedAsMethod).to.equal(false)

      // Check that the move operator is recognized
      expect(hasScope(r2.tokens, 'keyword.operator.move.cadence')).to.be.true
    })

    it('does not leak cast-target scope when followed by code block', () => {
      // Test case from Burner contract - cast followed by opening brace
      const lines = [
        '} else if let dict <- r as? @{HashableStruct: AnyResource} {',
        '    let keys = dict.keys',
        '}'
      ]

      let ruleStack = null
      const results = []
      for (const line of lines) {
        const result = grammar.tokenizeLine(line, ruleStack)
        results.push(result)
        ruleStack = result.ruleStack
      }

      // Line 2 should not have meta.type.cast-target scope leak
      const line2Scopes = results[1].tokens.flatMap(t => t.scopes)
      const hasCastTargetLeak = line2Scopes.some(s => s.includes('meta.type.cast-target'))
      expect(hasCastTargetLeak, 'Cast-target scope should not leak to next line').to.be.false

      // Line 2 should properly recognize "keys" as a member
      expect(results[1].tokens.some(t => 
        t.scopes.includes('variable.other.member.cadence') &&
        lines[1].slice(t.startIndex, t.endIndex) === 'keys'
      )).to.be.true
    })
  })

  describe('Pre/Post Conditions', () => {
    it('does not leak type scope from multi-line preconditions with comparison operators', () => {
      const lines = [
        '    access(contract) fun saveEpochMetadata(_ newMetadata: EpochMetadata) {',
        '        pre {',
        '            self.currentEpochCounter == 0 ||',
        '            (newMetadata.counter >= self.currentEpochCounter - 1 &&',
        '            newMetadata.counter <= self.proposedEpochCounter()):',
        '                "Cannot modify epoch metadata"',
        '        }',
        '        let foo = 1',
        '    }'
      ]

      let ruleStack = null
      const results = []

      for (let i = 0; i < lines.length; i++) {
        const result = grammar.tokenizeLine(lines[i], ruleStack)
        results.push(result)
        ruleStack = result.ruleStack
      }

      // Check that line with "let foo" doesn't have storage.type scope leak
      const letFooLine = results[7]
      const hasStorageTypeLeak = letFooLine.tokens.some(t => t.scopes.includes('storage.type.cadence'))
      expect(hasStorageTypeLeak).to.be.false

      // Verify the precondition string is correctly scoped
      const stringLine = results[5]
      const hasStringScope = stringLine.tokens.some(t => t.scopes.includes('string.quoted.double.single-line.cadence'))
      expect(hasStringScope).to.be.true

      // Verify comparison operators are not confused with generic type arguments
      const comparisonLine = results[4]
      const hasGenericTypeArgs = comparisonLine.tokens.some(t => t.scopes.includes('meta.type.arguments.cadence'))
      expect(hasGenericTypeArgs).to.be.false
    })
  })

  describe('Large File Tokenization', () => {
    it('does not leak scopes at end of large contract file', async () => {
      const fileContent = await readFile('test-data/FlowIDTableStaking.cdc')
      const lines = fileContent.toString('utf8').split('\n')

      let ruleStack = null
      const results = []

      // Tokenize every line
      for (let i = 0; i < lines.length; i++) {
        const result = grammar.tokenizeLine(lines[i], ruleStack)
        results.push(result)
        ruleStack = result.ruleStack
      }

      // The last token should only have the base source.cadence scope (no leaked scopes)
      const lastLine = results[results.length - 1]
      const lastToken = lastLine.tokens[lastLine.tokens.length - 1]

      // Should only be ["source.cadence"] or ["source.cadence", "punctuation..."]
      expect(lastToken.scopes[0]).to.equal('source.cadence')
      expect(lastToken.scopes.length).to.be.at.most(2)
    })
  })

  describe('Nested Function Calls Scope Leakage', () => {
    it('does not leak function call scope across lines with deeply nested calls', () => {
      const line1 = 'let id = 0'
      const line2 = 'panic("Approved node ".concat("Approved node ".concat("Approved node ".concat(id).concat(" does not")).concat(" does not")).concat(" does not")))'
      const line3 = 'hello'

      const r1 = grammar.tokenizeLine(line1)
      const r2 = grammar.tokenizeLine(line2, r1.ruleStack)
      const r3 = grammar.tokenizeLine(line3, r2.ruleStack)

      // Line 2 should have deeply nested function calls
      expect(hasScope(r2.tokens, 'entity.name.function.cadence')).to.be.true
      const concatCount = r2.tokens.filter(t =>
        line2.substring(t.startIndex, t.endIndex) === 'concat'
      ).length
      expect(concatCount).to.be.greaterThan(2) // Multiple concat calls

      // Line 3 should not be stuck in a function call context
      const helloScopes = r3.tokens.flatMap(t => t.scopes)
      const inFunctionCall = helloScopes.some(s => s.includes('meta.function-call'))
      expect(inFunctionCall).to.be.false
    })

    it('handles multi-line string concatenation with mixed parentheses', () => {
      const lines = [
        'assert(',
        '    stakeKey.verifyPoP(stakingKeyPoP.decodeHex()),',
        '    message:',
        '        "FlowIDTableStaking.NodeRecord.init: Cannot create node with ID "',
        '        .concat(id).concat(". The Proof of Possession (").concat(stakingKeyPoP)',
        '        .concat(") for the node\'s staking key (").concat(") is invalid")',
        ')',
        'let nextLine = "should not be in function call scope"'
      ]

      let ruleStack = null
      const results = []

      for (let i = 0; i < lines.length; i++) {
        const result = grammar.tokenizeLine(lines[i], ruleStack)
        results.push(result)
        ruleStack = result.ruleStack

        // Debug: Uncomment to see token-level function call nesting
        // console.log(`\n=== Line ${i + 1}: ${lines[i]} ===`);
        // result.tokens.forEach(t => {
        //   const text = lines[i].substring(t.startIndex, t.endIndex);
        //   const funcCallCount = t.scopes.filter(s => s === "meta.function-call.cadence").length;
        //   if (funcCallCount > 0 || text.includes("(") || text.includes(")")) {
        //     console.log(`  [${t.startIndex}-${t.endIndex}] "${text}" (${funcCallCount} function-call levels)`);
        //   }
        // });
      }

      // Line 1: assert( should open a function call
      expect(hasScope(results[0].tokens, 'entity.name.function.cadence')).to.be.true

      // Line 2: should recognize verifyPoP and decodeHex as methods
      expect(hasScope(results[1].tokens, 'entity.name.function.cadence')).to.be.true

      // Line 3: message: should be recognized as an argument label
      expect(hasScope(results[2].tokens, 'punctuation.separator.argument-label.cadence')).to.be.true

      // Line 4: should have string scope
      expect(hasScope(results[3].tokens, 'string.quoted.double.single-line.cadence')).to.be.true

      // Line 5: .concat should be recognized as methods
      const line5ConcatCount = results[4].tokens.filter(t =>
        lines[4].substring(t.startIndex, t.endIndex) === 'concat'
      ).length
      expect(line5ConcatCount).to.be.greaterThan(1)

      // Line 6: should have string and concat
      expect(hasScope(results[5].tokens, 'string.quoted.double.single-line.cadence')).to.be.true
      expect(hasScope(results[5].tokens, 'entity.name.function.cadence')).to.be.true

      // Line 7: closing ) should close the assert call
      expect(results[6].tokens.some(t => t.scopes.includes('punctuation.definition.arguments.end.cadence'))).to.be.true

      // Line 8: CRITICAL - should NOT be in a function call scope anymore
      const line8Scopes = results[7].tokens.flatMap(t => t.scopes)
      const line8InFunctionCall = line8Scopes.some(s => s.includes('meta.function-call'))
      expect(line8InFunctionCall).to.be.false
    })
  })
})
