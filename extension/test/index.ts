import * as path from 'path'
import * as Mocha from 'mocha'
import { glob } from 'glob'

export async function run (): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  })

  const testsRoot = path.resolve(__dirname, '..')

  // Add files to the test suite
  const files = await glob('**/**.test.js', { cwd: testsRoot })
  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)))

  // Run the mocha test
  await new Promise<void>((resolve, reject) => {
    mocha.run(failures => {
      if (failures > 0) {
        reject(`${failures} tests failed.`)
      } else {
        resolve()
      }
    })
  })
}

export async function delay (seconds: number): Promise<void> {
  await new Promise((resolve, reject) => {
    setTimeout(() => resolve(''), seconds * 1000)
  })
}
