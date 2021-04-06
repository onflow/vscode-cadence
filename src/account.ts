import { addAddressPrefix } from "./address";

// An account that can be used to submit transactions.
export class Account {
    index: number;
    address: string;
    name: string;
  
    constructor(name: string, address: string, index: number | null) {
      this.address = address;
      this.name = name;

      if (index != null){
        this.index = index
      } else {
        this.index = -1
      }
    }

    setIndex(index: number){
      this.index = index
    }
  
    getAddress(withPrefix: boolean = true): string {
      return withPrefix ? `0x${this.address}` : this.address
    }
  
    getName(): string {
      const name = this.name || `Account ${this.index + 1}`
      return `${name[0].toUpperCase()}${name.slice(1)}`
    }
  
    fullName(): string {
      return `${this.getName()} (${addAddressPrefix(this.address)})`;
    }
  }