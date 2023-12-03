import { FILE_TEST_SEPARATOR } from "./constants";

export function encodeTestId (file: string, testName?: string): string {
  return `${file}${FILE_TEST_SEPARATOR}${testName}`
}

export function decodeTestId (id: string): { file: string, testName?: string } {
  const [file, testName] = id.split(FILE_TEST_SEPARATOR)
  return { file, testName }
}