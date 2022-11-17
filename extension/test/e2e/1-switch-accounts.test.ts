import { Accounts, initTest, initExtension, openFile, switchAccount } from './cypress-helpers'

describe('User Story test: Switch Accounts', () => {
  beforeEach(() => {
    initTest(cy)
    initExtension(cy)
  })

  afterEach(() => {})

  it('Switch accounts by entering name', () => {
    openFile(cy, 'NonFungibleToken.cdc')

    cy.contains(`Active account: ${Accounts.Alice}`, { matchCase: false })
      .click({ force: true })

    cy.type(`${Accounts.Bob}{enter}`)

    cy.contains(`Switched to account ${Accounts.Bob}`, { timeout: 10000, matchCase: false })
    cy.contains(`Active account: ${Accounts.Bob}`, { timeout: 10000, matchCase: false })
  })

  it('Switch accounts by click', () => {
    openFile(cy, 'NonFungibleToken.cdc')
    switchAccount(cy, Accounts.Alice, Accounts.Bob)
  })
})
