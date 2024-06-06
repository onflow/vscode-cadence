import * as crypto from 'crypto'

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: crypto,
  })
}