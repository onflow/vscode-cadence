import * as assert from 'assert'

export const MaxTimeout = 100000

export function ASSERT_EQUAL (a: any, b: any): void {
  assert.strictEqual(a, b)
}
