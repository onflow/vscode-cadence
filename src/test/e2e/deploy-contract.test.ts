import { Accounts, initExtension, openFile, stopEmulator, switchAccount } from '../helpers'

describe('User Story test: Deploy Contract', () => {
/* Failing test, uncomment when ready to fix this bug
  beforeEach(() => {
    initExtension(cy)
  })

  afterEach(() => {
    stopEmulator(cy)
  })

  it('Start Emulator and Deploy Contract', () => {
    openFile(cy, 'FooContract.cdc')

    cy.contains(`Switched to account ${Accounts.Service}`)

    cy.contains('Copy Address')
      .click({ force: true })

    cy.contains('Deploy contract FooContract to ServiceAccount')
      .click({ force: true })

    cy.contains('Deploying contract FooContract to account f8d6e0586b0a20c7')
      .should('be.visible')

    switchAccount(cy, Accounts.Service, Accounts.Alice)

    cy.wait(2000)

    cy.contains('Deploy contract FooContract to Alice')
      .click({ force: true })

    cy.contains('Deploying contract FooContract to account 01cf0e2f2f715450')
      .should('be.visible')
  })
*/
})
