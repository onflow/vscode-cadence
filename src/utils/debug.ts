let DEBUG_ACTIVE: boolean = true

export function DEBUG_LOG(str: string) {
    if (DEBUG_ACTIVE) {
        console.log(str)
    }
}
