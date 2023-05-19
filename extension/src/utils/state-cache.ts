import { BehaviorSubject, Observer, firstValueFrom, skip } from 'rxjs'

/**
 * @template T
 * @class StateCache
 * @description
 * A class that caches a value and fetches it asynchronously.  Comparable to SWR in React.
 */
export class StateCache<T> {
  // Validation state:
  // 0: value is valid
  // 1: value is invalid, and is being fetched
  // 2: value is invalid, and is being fetched, and another fetch is queued
  #validaitonState: 0 | 1 | 2 = 0
  #value: BehaviorSubject<T | undefined> = new BehaviorSubject<T | undefined>(undefined)
  #fetcher: () => Promise<T>

  constructor (fetcher: () => Promise<T>) {
    this.#fetcher = fetcher
    this.invalidate()
  }

  async getValue (): Promise<T> {
    if (this.#validaitonState === 0) {
      return this.#value?.getValue() as T
    } else {
      const queueNumber = this.#validaitonState - 1
      return await (firstValueFrom((this.#value as BehaviorSubject<T>).pipe(skip(queueNumber + 1))))
    }
  }

  async #fetch (): Promise<void> {
    let value: T | undefined
    try {
      value = await this.#fetcher()
    } catch (e) {
      console.error('State cache fetching failed, retrying in 1s...', e)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return await this.#fetch()
    }
    this.#value.next(value)
    this.#validaitonState -= 1
    if (this.#validaitonState > 0) {
      void this.#fetch()
    }
  }

  invalidate (): void {
    this.#validaitonState = Math.min(this.#validaitonState + 1, 2) as 0 | 1 | 2
    if (this.#validaitonState === 1) {
      void this.#fetch()
    }
  }

  setFetcher (fetcher: () => Promise<T>): void {
    this.#fetcher = fetcher
    this.invalidate()
  }

  subscribe (observerOrNext?: Partial<Observer<T | undefined>> | ((value: T | undefined) => void) | undefined): void {
    this.#value.subscribe(observerOrNext)
  }
}
