import { Account } from '../../src/emulator/account'
import { AccountData } from '../../src/emulator/local/account-data'
import { ASSERT_EQUAL } from './test-utils'

describe('Account Data Unit Test', () => {
  it('Tests AccountData class and maintaining a list of accounts', () => {
    const accountData = new AccountData()
    let numAccounts = 0

    // No accounts
    ASSERT_EQUAL(accountData.getAccount(numAccounts), null)
    const account1 = new Account('account1', '0x1')
    ASSERT_EQUAL(accountData.accountExists(account1.name), false)
    ASSERT_EQUAL(accountData.getNumAccounts(), numAccounts)

    // Test add account
    accountData.addAccount(account1)
    numAccounts++
    ASSERT_EQUAL(accountData.accountExists(account1.name), true)
    ASSERT_EQUAL(accountData.getNumAccounts(), numAccounts)

    // Test reset
    accountData.resetAccounts()
    numAccounts = 0
    ASSERT_EQUAL(accountData.getNumAccounts(), numAccounts)
    ASSERT_EQUAL(accountData.getActiveAccount(), null)
  })
})
