<<<<<<< HEAD
import { Accounts, initTest, initExtension, openFile, switchAccount } from '../cypress-helpers'
=======
import { Accounts, initTest, initExtension, openFile, stopEmulator, switchAccount } from './cypress-helpers'
>>>>>>> cdc96c18989e4e96afe3979c78cef59a49d928f2

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

    cy.get('.quick-input-box > .monaco-inputbox > .ibwrapper > .input')
      .type(`${Accounts.Bob}{enter}`)

    cy.contains(`Switched to account ${Accounts.Bob}`, { timeout: 10000, matchCase: false })
    cy.contains(`Active account: ${Accounts.Bob}`, { timeout: 10000, matchCase: false })
  })

  it('Switch accounts by click', () => {
    openFile(cy, 'NonFungibleToken.cdc')
    switchAccount(cy, Accounts.Alice, Accounts.Bob)
  })
})
