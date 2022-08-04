import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    projectId:"3ei47t",
    fixturesFolder: 'extension/test/fixtures',
    specPattern: 'extension/test/e2e/*.test.ts',
    video: true,
    screenshotOnRunFailure: true,
    supportFile: false
  }
})
