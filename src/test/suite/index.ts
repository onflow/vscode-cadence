import * as path from 'path'
import * as Mocha from 'mocha'
import * as glob from 'glob'

export async function run (): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd'
  })

  const testsRoot = path.resolve(__dirname, '..')

  return await new Promise((resolve, reject) => {
    glob('**/**.integration.test.js', { cwd: testsRoot }, (err, files) => {
      if (err !== null) {
        return reject(err)
      }

      // Add files to the test suite
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)))

      try {
        // Run the mocha test
        mocha.run(failures => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`))
          } else {
            resolve()
          }
        })
      } catch (err) {
        console.error(err)
        reject(err)
      }
    })
  })
}

export async function delay (seconds: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), seconds * 1000)
  })
}
