export const makeArgsFlag = (args: string) => {
    if (args !== ""){
        const escapedArgs = args.replace(/"/g,'\\"')
        return `--args="[${escapedArgs}]"`
    }

    return ""
}

export const makeFlag = (flagName: string) => (flagValue: string) => {
    return flagValue ? `--${flagName}="${flagValue}"` : ""
}


export const stripLineEnd = (input:string) => input.replace(/\n/g,'')
