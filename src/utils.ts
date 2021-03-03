export const makeArgsFlag = (args: string[]) => {
  if (args.length > 0) {
    const escapedArgs = args
      .map((arg) => {
        const clean = stripLineEnd(arg)
          .replace(/[\w\d]+(?=:)/g, '"$&"')
          .replace(/"/g, '\\"')
          .replace(/\\/g, '')
        const json = JSON.parse(clean)
        return JSON.stringify(json).replace(/"/g, '\\"')
      })
      .join(",");
    return `--args="[${escapedArgs}]"`;
  }

  return "";
};

export const makeFlag = (flagName: string) => (flagValue: string) => {
  return flagValue ? `--${flagName}="${flagValue}"` : ""
}


export const stripLineEnd = (input: string) => input.replace(/\n/g, '')
