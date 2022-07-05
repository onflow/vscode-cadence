import * as path from 'path'
//import * as Mocha from 'mocha'
import * as glob from 'glob'

export async function run (): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd'
  })
  console.log("INDEX.TS RUN")

  const testsRoot = path.resolve(__dirname, '..')

  return await new Promise((resolve, reject) => {
    console.log("GLOB INTEGRATION TEST...")
    glob('**/**.integration.test.js', { cwd: testsRoot }, (err, files) => {
      if (err != null) {
        return reject(err)
      }

      // Add files to the test suite
      console.log("ADDING FILES TO TEST SUITE...")
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)))

      try {
        // Run the mocha test
        console.log("RUNNING MOCHA TEST...")
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
  await new Promise((resolve, reject) => {
    setTimeout(() => resolve(''), seconds * 1000)
  })
}
