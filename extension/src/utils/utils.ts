export const FILE_PATH_EMPTY = ''

export async function delay (seconds: number): Promise<void> {
  await new Promise((resolve, reject) => {
    setTimeout(() => resolve(''), seconds * 1000)
  })
}
