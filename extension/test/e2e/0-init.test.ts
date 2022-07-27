/* Contains cypress code to initialize the workspace before any other testing takes place */
import { initTest } from '../cypress-helpers'

describe('Initialize Workspace Settings', () => {
  beforeEach(() => {
    initTest(cy)
  })

  afterEach(() => {
    cy.wait(5000)
  })

  it('Check flow-cli', () => {
    // Add execute permissions to flow-cli
    //cy.exec('flow')
    cy.exec('docker exec vscode sudo chmod +x /usr/local/bin/flow')

    // Ensure flow-cli can be executed
    cy.exec('docker exec vscode flow')
  })

  // Trust the workspace folder and close pop-up in vscode
  it('Trust Workspace Folder', () => {
    cy.contains('Trust folder')
      .click({ force: true })
  })
})
