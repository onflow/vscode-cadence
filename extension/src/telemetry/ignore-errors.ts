/* Error names / messages for sentry and mixpanel to ignore */

export const IgnoreErrors = [
  'SyntaxError', // Caused by Language Server on invalid syntax
  'No valid config path' // User doesn't have a valid flow.json file path
]

export function ignoreError (err: Error): boolean {
  let ignore: boolean = false
  IgnoreErrors.forEach((errStr: string) => {
    if (err.name.includes(errStr) || err.message.includes(errStr)) {
      ignore = true
    }
  })
  return ignore
}
