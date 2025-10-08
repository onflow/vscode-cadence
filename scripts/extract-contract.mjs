import { createReadStream, promises as fs } from 'fs'
import readline from 'readline'

const contractName = process.argv[2]
if (!contractName) {
  console.error('Usage: node extract-contract.mjs <contract-name>')
  process.exit(1)
}

const csvPath = 'tm-tests/.fixtures-cache/contracts.csv'

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

async function * readCsvRows (filepath) {
  const fileStream = createReadStream(filepath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let buffered = ''
  let inQuotes = false

  for await (const line of rl) {
    if (buffered) {
      buffered += '\n' + line
    } else {
      buffered = line
    }

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          i++
        } else {
          inQuotes = !inQuotes
        }
      }
    }

    if (!inQuotes) {
      yield buffered
      buffered = ''
    }
  }

  if (buffered) {
    yield buffered
  }
}

async function main () {
  for await (const row of readCsvRows(csvPath)) {
    const [locationRaw, codeRaw] = parseTwoFieldCsvLine(row)
    const location = unquoteCsvField(locationRaw).trim()
    const code = unquoteCsvField(codeRaw)

    if (location === contractName) {
      await fs.writeFile(`tm-tests/fixtures/${contractName}.cdc`, code)
      console.log(`Extracted ${contractName} to tm-tests/fixtures/${contractName}.cdc`)
      console.log(`Contract length: ${code.length} bytes`)
      process.exit(0)
    }
  }

  console.error(`Contract ${contractName} not found in CSV`)
  process.exit(1)
}

main().catch(console.error)
