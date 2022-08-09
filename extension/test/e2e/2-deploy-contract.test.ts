import { Accounts, initTest, initExtension, openFile, stopEmulator, switchAccount } from './cypress-helpers'

describe('User Story test: Deploy Contract', () => {
  beforeEach(() => {
    initTest(cy)
    initExtension(cy)
  })

  afterEach(() => {})

  it('Start Emulator and Deploy Contract', () => {
    openFile(cy, 'FooContract.cdc')

    cy.contains('Deploy contract FooContract to Alice')
      .click({ force: true })

    cy.contains('Deploying contract FooContract to account f8d6e0586b0a20c7')
      .should('be.visible')

    switchAccount(cy, Accounts.Alice, Accounts.Bob)

    // Click to update UI
    cy.contains('FooContract {}')
      .click({ force: true })

    cy.wait(5000)

    cy.contains('Deploy contract FooContract to Bob')
      .click({ force: true })

    cy.contains('Deploying contract FooContract to account 179b6b1cb6755e31')
      .should('be.visible')
  })
})
