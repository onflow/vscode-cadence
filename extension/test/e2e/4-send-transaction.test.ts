/* TODO: This test will be fixed with hosted emulator changes
import { initTest, initExtension, openFile, stopEmulator } from '../cypress-helpers'

describe('User Story test: Send Transaction', () => {
  beforeEach(() => {
    initTest(cy)
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
*/
