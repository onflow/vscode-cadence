import { initTest, initExtension, openFile } from '../cypress-helpers'

describe('User Story test: Send Transaction', () => {
  beforeEach(() => {
    initTest(cy)
    initExtension(cy)
  })

  afterEach(() => {})

  it('Send Transaction using Emulator', () => {
    openFile(cy, 'Tx.cdc')

    cy.contains('Send signed by Alice').click({ force: true })
    cy.contains('Transaction status: SEALED')
  })
})
