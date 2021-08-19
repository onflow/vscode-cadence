import { initExtension, openFile } from '../helpers';

describe('User Story test: Send Transaction', () => {

    beforeEach(() => {
        initExtension(cy)
    })

    it('Send Transaction using Emulator', () => {
        openFile(cy, 'Tx.cdc')

        cy.contains('Send signed by ServiceAccount').click({ force: true })
        cy.contains('Transaction status: SEALED')
    })

})