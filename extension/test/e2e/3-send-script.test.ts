import { initTest, initExtension, openFile, stopEmulator } from './cypress-helpers'

describe('User Story test: Send Script', () => {
  beforeEach(() => {
    initTest(cy)
    initExtension(cy)
  })

  afterEach(() => {
    stopEmulator(cy)
  })

  it('Send Script using Emulator', () => {
    openFile(cy, 'Script.cdc')
    cy.contains('Execute script').click({ force: true })
    cy.contains('Result: 42.00000000')
  })
})
