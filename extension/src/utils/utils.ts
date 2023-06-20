// Check if a promise was resolved or rejected
export async function didResolve (promise: Promise<any>): Promise<boolean> {
  try {
    await promise
    return true
  } catch (e) {
    return false
  }
}

export async function delay (seconds: number): Promise<void> {
  await new Promise((resolve, reject) => {
    setTimeout(() => resolve(''), seconds * 1000)
  })
}
