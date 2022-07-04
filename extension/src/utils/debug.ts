const DEBUG_ACTIVE: boolean = true

export function DEBUG_LOG (str: string): void {
  if (DEBUG_ACTIVE) {
    console.log(str)
  }
}
