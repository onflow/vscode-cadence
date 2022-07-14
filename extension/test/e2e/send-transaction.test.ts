import { initExtension, openFile, stopEmulator } from '../cypress-helpers'

describe('User Story test: Send Transaction', () => {
  beforeEach(() => {
    initExtension(cy)
  })

  afterEach(() => {
    stopEmulator(cy)
  })

  it('Send Transaction using Emulator', () => {
    openFile(cy, 'Tx.cdc')

    cy.contains('Send signed by ServiceAccount').click({ force: true })
    cy.contains('Transaction status: SEALED')
  })
})
