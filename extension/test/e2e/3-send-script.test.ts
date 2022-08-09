import { initTest, initExtension, openFile } from './cypress-helpers'

describe('User Story test: Send Script', () => {
  beforeEach(() => {
    initTest(cy)
    initExtension(cy)
  })

  afterEach(() => {})

  it('Send Script using Emulator', () => {
    openFile(cy, 'Script.cdc')
    cy.contains('Execute script').click({ force: true })
    cy.contains('Result: 42.00000000')
  })
})
