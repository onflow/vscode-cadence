/**
 * Account representing an address on Flow network
 */
export class Account {
  index: number
  address: string
  name: string

  constructor (name: string, address: string) {
    this.address = address
    this.name = name
    this.index = -1
  }

  setIndex (index: number): void {
    this.index = index
  }

  /**
   * Get address of the account
   * @param {boolean} withPrefix return address with or without prefix
   * @returns {string} address
   */
  getAddress (withPrefix: boolean = true): string {
    if (this.address.includes('0x')) {
      return withPrefix ? this.address : this.address.replace('0x', '')
    } else {
      return withPrefix ? `0x${this.address}` : this.address
    }
  }

  /**
   * Get name of the account
   * @returns {string} name
   */
  getName (): string {
    const name = this.name === '' ? `Account ${this.index + 1}` : this.name
    return `${name[0].toUpperCase()}${name.slice(1)}`
  }

  /**
   * Get account name, consists of name and address
   * @returns {string} full name
   */
  fullName (): string {
    return `${this.getName()} (${this.getAddress()})`
  }
}
