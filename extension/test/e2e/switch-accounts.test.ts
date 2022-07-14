
describe('User Story test: Switch Accounts', () => {
/* Failing test, uncomment when ready to fix this bug
    beforeEach(() => {
        initExtension(cy)
    })

    afterEach(() => {
        stopEmulator(cy)
    })

    it('Switch accounts by entering name', () => {
        openFile(cy, 'NonFungibleToken.cdc')
        cy.contains(`Switched to account ${Accounts.Service}`)

        cy.contains(`Active account: ${Accounts.Service}`, { matchCase: false })
            .click({ force: true })

        cy.get('.quick-input-box > .monaco-inputbox > .ibwrapper > .input')
            .type(`${Accounts.Dave}{enter}`)

        cy.contains(`Switched to account ${Accounts.Dave}`, { timeout: 10000, matchCase: false })
        cy.contains(`Active account: ${Accounts.Dave}`, { timeout: 10000, matchCase: false })

        cy.contains('Deploy contract interface NonFungibleToken to Alice')
    })

    it('Switch accounts by click', () => {
        openFile(cy, 'NonFungibleToken.cdc')
        cy.contains(`Switched to account ${Accounts.Service}`)

        cy.contains(`Active account: ${Accounts.Service}`, { matchCase: false })
            .click({ force: true })

        cy.contains('Dave').click({ force: true })

        cy.contains(`Switched to account ${Accounts.Dave}`, { timeout: 10000, matchCase: false })
        cy.contains(`Active account: ${Accounts.Dave}`, { timeout: 10000, matchCase: false })
        //TODO: need to click on the screen to update UI :)
        //TODO: Is refreshCodeLense() suppost to make this work???
        cy.contains('Deploy contract interface NonFungibleToken to Dave') 
    })
*/
})
