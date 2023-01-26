import { spawn, ChildProcessWithoutNullStreams } from 'child_process'

let emulator: ChildProcessWithoutNullStreams | null = null

/* Helper functions and data for testing with Cypress */
export const Accounts = {
  Alice: 'Alice (0x01cf0e2f2f715450)',
  Bob: 'Bob (0x179b6b1cb6755e31)',
  Charlie: 'Charlie (0xf3fcd2c1a78f5eee)',
  Dave: 'Dave (0xe03daebed8ca0615)' // First new account created
}

export function initTest (cy: Cypress.cy): void {
  cy.on('uncaught:exception', (err, runnable) => {
    console.log(err)
    return false
  })

  cy.visit('http://localhost:8888')
  cy.wait(10000)

  startLocalEmulator()
  cy.wait(5000)
}

export function initExtension (cy: Cypress.cy): void {
  openFile(cy, 'NonFungibleToken.cdc') // default file to trigger start extension
  cy.contains('Flow emulator connected', { timeout: 100000 })
}

export function openFile (cy: Cypress.cy, name: string): void {
  cy.get('.monaco-list-row')
    .contains(name, { timeout: 5000 })
    .click({ force: true })
  cy.wait(2000)
}

export function switchAccount (cy: Cypress.cy, from: string, to: string): void {
  cy.contains(`Active account: ${from}`, { matchCase: false })
    .click({ force: true })

  cy.contains(to).click({ force: true })

  cy.contains(`Switched to account ${to}`, { timeout: 10000, matchCase: false })
  cy.contains(`Active account: ${to}`, { timeout: 10000, matchCase: false })
}

export function startLocalEmulator (): void {
  emulator = spawn('flow emulator')
}

export function killLocalEmulator (): void {
  if (emulator != null) {
    emulator.kill()
    emulator = null
  }
}
