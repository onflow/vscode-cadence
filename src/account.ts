const addressPrefix = '0x'

// An account that can be used to submit transactions.
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

  getAddress (withPrefix: boolean = true): string {
    if (this.address.includes('0x')) {
      return withPrefix ? this.address : this.address.replace('0x', '')
    } else {
      return withPrefix ? `0x${this.address}` : this.address
    }
  }

  getName (): string {
    const name = this.name === '' ? `Account ${this.index + 1}` : this.name
    return `${name[0].toUpperCase()}${name.slice(1)}`
  }

  fullName (): string {
    return `${this.getName()} (${this.getAddress()})`
  }
}
