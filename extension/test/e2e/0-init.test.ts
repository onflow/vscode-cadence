/* Contains cypress code to initialize the workspace before any other testing takes place */
import { initTest, killLocalEmulator } from './cypress-helpers'

describe('Initialize Workspace Settings', () => {
  beforeEach(() => {
    initTest(cy)
  })

  afterEach(() => {
    killLocalEmulator()
    cy.wait(5000)
  })

  // Trust the workspace folder and close pop-up in vscode
  it('Trust Workspace Folder', () => {
    cy.contains('Trust folder')
      .click({ force: true })
  })
})
