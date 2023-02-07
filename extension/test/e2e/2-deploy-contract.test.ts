import { Accounts, initTest, initExtension, openFile, switchAccount, killLocalEmulator } from './cypress-helpers'

describe('User Story test: Deploy Contract', () => {
  beforeEach(() => {
    initTest(cy)
    initExtension(cy)
  })

  afterEach(() => {
    killLocalEmulator()
  })

  it('Start Emulator and Deploy Contract', () => {
    openFile(cy, 'FooContract.cdc')

    cy.contains('Deploy contract FooContract to Alice')
      .click({ force: true })

    cy.contains('Contract FooContract has been deployed to account Alice')

    switchAccount(cy, Accounts.Alice, Accounts.Bob)

    // Click to update UI
    cy.contains('FooContract {}')
      .click({ force: true })

    cy.wait(5000)

    cy.contains('Deploy contract FooContract to Bob')
      .click({ force: true })

    cy.contains('Contract FooContract has been deployed to account Bob')
  })
})
