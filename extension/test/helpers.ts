
// Helper to open a file in editor with cypress
export function openFile (cy: Cypress.cy, name: string): void {
  cy.get('.monaco-list-row')
    .contains(name)
    .click({ force: true })

  cy.wait(2000)
}

export function trustAuthors(cy: Cypress.cy): void {
  cy.contains('Trust folder')
    .click({ force: true })
  cy.wait(5000)
}

export function startEmulator (cy: Cypress.cy): void {
  cy.contains('Start Flow Emulator')
    .click({ force: true })
  cy.contains('Stop Flow Emulator', { timeout: 10000 })
  cy.wait(5000)
}

export function stopEmulator (cy: Cypress.cy): void {
  cy.contains('Stop Flow Emulator')
    .click({ force: true })
}

export function initExtension (cy: Cypress.cy): void {
  cy.on('uncaught:exception', (err, runnable) => {
    console.log(err)
    return false
  })

  cy.visit('http://localhost:8888')
  cy.get('.monaco-list-row', { timeout: 10000 }) // wait for ide to init
  cy.get('. ')

  /*
  cy.wait(20000)
  trustAuthors(cy)
  cy.get('. ')
  */

  openFile(cy, 'NonFungibleToken.cdc') // default file to trigger start extension
  cy.contains('Cadence language server started', { timeout: 30000 })
  startEmulator(cy)
}

export function switchAccount (cy: Cypress.cy, from: string, to: string): void {
  cy.contains(`Active account: ${from}`, { matchCase: false })
    .click({ force: true })

  cy.contains(to).click({ force: true })

  cy.contains(`Switched to account ${to}`, { timeout: 10000, matchCase: false })
  cy.contains(`Active account: ${to}`, { timeout: 10000, matchCase: false })
}

export const Accounts = {
  Service: 'ServiceAccount (0xf8d6e0586b0a20c7)',
  Alice: 'Alice (0x01cf0e2f2f715450)',
  Dave: 'Dave (0xe03daebed8ca0615)'
}
