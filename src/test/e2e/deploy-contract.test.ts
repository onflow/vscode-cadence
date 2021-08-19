import {Accounts, initExtension, openFile, switchAccount} from '../helpers';

describe('User Story test: Deploy Contract', () => {

    beforeEach(() => {
        initExtension(cy)
    })

    it('Start Emulator and Deploy Contract', () => {
        openFile(cy, 'NonFungibleToken.cdc')

        cy.contains(`Switched to account ${Accounts.Service}`)

        cy.contains('Copy Address')
            .click({ force: true })

        cy.contains('Deploy contract interface NonFungibleToken to ServiceAccount')
            .click({ force: true })

        cy.contains('Deploying contract NonFungibleToken to account f8d6e0586b0a20c7')
            .should('be.visible')

        switchAccount(cy, Accounts.Service, Accounts.Alice)

        cy.contains('Deploy contract interface NonFungibleToken to Alice')
            .click({ force: true })

        cy.contains('Deploying contract NonFungibleToken to account 01cf0e2f2f715450')
            .should('be.visible')

    })

})