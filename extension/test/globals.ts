import * as assert from 'assert'

export const MaxTimeout = 100000
export const CONNECTED = true
export const DISCONNECTED = false

export function ASSERT_EQUAL (a: any, b: any): void {
  assert.strictEqual(a, b)
}
