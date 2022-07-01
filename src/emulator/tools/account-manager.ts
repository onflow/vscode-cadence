/*  AccountManager is responsible for creating and switching accounts. 
    It deals with the local configuration and language server.
*/
import { ext } from "../../extension"
import { Config } from "../local/config"
import { LanguageServerAPI } from "../server/language-server"
import { window, env } from "vscode"
import {
    COPY_ADDRESS,
    CREATE_NEW_ACCOUNT,
    ACTIVE_PREFIX,
    INACTIVE_PREFIX,
    ADD_NEW_PREFIX
  } from '../../utils/strings'

export class AccountManager {
    config: Config
    api: LanguageServerAPI
    constructor(config: Config, api: LanguageServerAPI) {
      this.config = config,
      this.api = api
    }

    async createNewAccount () {
        try {
          const account = await this.api.createAccount()
          this.config.addAccount(account)
          const lastIndex = this.config.accounts.length - 1
          await this.setActiveAccount(lastIndex)

          ext.emulatorStateChanged()
        } catch (err) { // ref: is error handling necessary here?
          window.showErrorMessage(`Failed to create account: ${err.message as string}`)
            .then(() => {}, () => {})
        }
    }

    getActiveAccount () {
      return this.config.activeAccount
    }

    async setActiveAccount (activeIndex: number) {
        const activeAccount = this.config.getAccount(activeIndex)
      
        if (activeAccount == null) {
          window.showErrorMessage('Failed to switch account: account does not exist.')
            .then(() => {}, () => {})
          return
        }
      
        try {
          await this.api.switchActiveAccount(activeAccount)
          this.config.setActiveAccount(activeIndex)

          window.showInformationMessage(
            `Switched to account ${activeAccount.fullName()}`,
            COPY_ADDRESS
          ).then((choice) => {
            if (choice === COPY_ADDRESS) {
              env.clipboard.writeText(`0x${activeAccount.address}`)
                .then(() => {}, () => {})
            }
          }, () => {})
      
          ext.emulatorStateChanged()
        } catch (err) {
          window.showErrorMessage(`Failed to switch account: ${err.message as string}`)
            .then(() => {}, () => {})
        }
      }

    // Switches the active account to the option selected by the user. The selection
    // is propagated to the Language Server.
    switchActiveAccount () {
        // Create the options (mark the active account with an 'active' prefix)
        const accountOptions = Object.values(this.config.accounts)
        // Mark the active account with a `*` in the dialog
        .map((account) => {
            const prefix: string =
            account.index === this.config.activeAccount ? ACTIVE_PREFIX : INACTIVE_PREFIX
            const label = `${prefix} ${account.fullName()}`
    
            return {
                label: label,
                target: account.index
            }
        })
    
        accountOptions.push({
            label: `${ADD_NEW_PREFIX} ${CREATE_NEW_ACCOUNT}`,
            target: accountOptions.length
        })
    
        window.showQuickPick(accountOptions).then(async (selected) => {
        // `selected` is undefined if the QuickPick is dismissed, and the
        // string value of the selected option otherwise.
        if (selected === undefined) {
            return
        }
    
        if (selected.target === accountOptions.length - 1) {
            await this.createNewAccount()
            return
        }
    
        await this.setActiveAccount(selected.target)
        ext.emulatorStateChanged()
        }, () => {})
  }
}