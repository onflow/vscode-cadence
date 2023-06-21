import path = require("path")

// This is a special test to only test dependency installation
// This is necessary for Windows because 
export async function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  })

  const file = path.resolve(__dirname, './integration/0 - dependencies.test.js')
  mocha.addFile(file)
  return await new Promise((resolve, reject) => {
    mocha.run(failures => {
      if (failures > 0) {
        reject(new Error(`Dependency installation failed`))
      } else {
        resolve()
      }
    }
    )
  })
}