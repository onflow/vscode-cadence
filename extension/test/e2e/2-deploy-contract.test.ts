import { Accounts, initTest, initExtension, openFile, stopEmulator, switchAccount } from '../cypress-helpers'

describe('User Story test: Deploy Contract', () => {
  beforeEach(() => {
    initTest(cy)
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

    // Click to update UI
    cy.contains('FooContract {}')
      .click({ force: true })

    cy.wait(5000)

    cy.contains('Deploy contract FooContract to Alice')
      .click({ force: true })

    cy.contains('Deploying contract FooContract to account 01cf0e2f2f715450')
      .should('be.visible')
  })
})
