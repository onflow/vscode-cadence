import { BehaviorSubject, Observable, Observer, Subscription, firstValueFrom, skip } from 'rxjs'

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
  #validationState: ValidationState = ValidationState.Valid
  #value: BehaviorSubject<T | undefined> = new BehaviorSubject<T | undefined>(undefined)
  #fetcher: () => Promise<T>
  // Observable to subscribe to in order to skip initial undefined value
  #observable: Observable<T> = (this.#value as BehaviorSubject<T>).pipe(skip(1))

  constructor (fetcher: () => Promise<T>) {
    this.#fetcher = fetcher
    this.invalidate()
  }

  async getValue (): Promise<T> {
    if (this.#validationState === ValidationState.Valid) {
      return (this.#value as BehaviorSubject<T>).getValue()
    } else {
      const queueNumber = this.#validationState - 1
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
    this.#validationState -= 1
    if (this.#validationState > 0) {
      void this.#fetch()
    }
  }

  invalidate (): void {
    this.#validationState = Math.min(this.#validationState + 1, 2)
    // If we're not already fetching, start fetching
    if (this.#validationState === ValidationState.Fetching) {
      void this.#fetch()
    }
  }

  setFetcher (fetcher: () => Promise<T>): void {
    this.#fetcher = fetcher
    this.invalidate()
  }

  subscribe (observerOrNext?: Partial<Observer<T>> | ((value: T) => void) | undefined): Subscription {
    return this.#observable.subscribe(observerOrNext)
  }
}
