import { BehaviorSubject, Observer, firstValueFrom, skip } from 'rxjs'

enum ValidationState {
  Valid = 0,
  Fetching = 1,
  FetchingAndQueued = 2
}

/**
 * @template T
 * @class StateCache
 * @description
 * A class that caches a value and fetches it asynchronously.  Comparable to SWR in React.
 */
export class StateCache<T> {
  #validaitonState: ValidationState = ValidationState.Valid
  #value: BehaviorSubject<T | undefined> = new BehaviorSubject<T | undefined>(undefined)
  #fetcher: () => Promise<T>

  constructor (fetcher: () => Promise<T>) {
    this.#fetcher = fetcher
    this.invalidate()
  }

  async getValue (): Promise<T> {
    if (this.#validaitonState === ValidationState.Valid) {
      return (this.#value as BehaviorSubject<T>).getValue()
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
    this.#validaitonState = Math.min(this.#validaitonState + 1, 2)
    // If we're not already fetching, start fetching
    if (this.#validaitonState === ValidationState.Fetching) {
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
