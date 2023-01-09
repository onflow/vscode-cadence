/* Contains functions for parsing. Should be tested in parser.unit.test.ts */

export function parseFlowCliVersion (buffer: Buffer | string): string {
  return (buffer.toString().split('\n')[0]).split(' ')[1]
}
