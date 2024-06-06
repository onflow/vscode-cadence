import * as crypto from 'crypto'

if (globalThis.crypto == null) {
  Object.defineProperty(globalThis, 'crypto', {
    value: crypto
  })
}
