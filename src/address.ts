const addressPrefix = '0x'

export function addAddressPrefix (address: string): string {
  if (address.slice(0, 2) === addressPrefix) {
    return address
  }

  return addressPrefix + address
}
