export function semaphore (concurrency: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let current = 0
  const queue: Array<() => Promise<void>> = []
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return await new Promise((resolve, reject) => {
      const run = async (): Promise<void> => {
        current++
        try {
          resolve(await fn())
        } catch (error) {
          reject(error)
        } finally {
          current--
          if (queue.length > 0) {
            void queue.shift()?.()
          }
        }
      }
      if (current >= concurrency) {
        queue.push(run)
      } else {
        void run()
      }
    })
  }
}
