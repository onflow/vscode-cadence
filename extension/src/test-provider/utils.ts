import { TEST_FUNCTION_PREFIX } from './constants'

export function encodeTestFunctionId (testName: string): string {
  return `${TEST_FUNCTION_PREFIX}${testName}`
}

export function decodeTestFunctionId (id: string): string | null {
  return id.startsWith(TEST_FUNCTION_PREFIX) ? id.slice(TEST_FUNCTION_PREFIX.length) : null
}
