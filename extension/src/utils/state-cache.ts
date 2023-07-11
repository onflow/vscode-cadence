import { BehaviorSubject, Observable, firstValueFrom, map, skip } from 'rxjs'

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
 * It provides the following guarantees:
 * - The value is always up to date
 * - The value is only fetched once per invalidation
 */
export class StateCache<T> extends Observable<T> {
  #validationState: ValidationState = ValidationState.Valid
  #value: BehaviorSubject<[T | null, Error | null] | undefined> = new BehaviorSubject<[T | null, Error | null] | undefined>(undefined)
  #fetcher: () => Promise<T>

  // Observable to subscribe to in order to skip initial undefined value and clean up errors
  #observable: Observable<T> = (this.#value as BehaviorSubject<[T | null, Error | null]>).pipe(skip(1), map(([value, error]) => {
    if (error !== null) {
      throw error
    } else {
      return value as T
    }
  }))

  constructor (fetcher: () => Promise<T>) {
    // Initialize as an observable
    super((subscriber) => this.#observable.subscribe(subscriber))

    // Setup fetcher and fetch initial value
    this.#fetcher = fetcher
    this.invalidate()
  }

  async getValue (): Promise<T> {
    let value: T | null, error: Error | null
    if (this.#validationState === ValidationState.Valid) {
      [value, error] = (this.#value as BehaviorSubject<[T | null, Error | null]>).getValue()
    } else {
      const queueNumber = this.#validationState - 1
      ;[value, error] = await (firstValueFrom((this.#value as BehaviorSubject<[T, Error]>).pipe(skip(queueNumber + 1))))
    }

    // If error, rethrow with added stack trace
    if (error !== null) {
      // Create a new Error object
      const newError = new Error(error.message)
      // Append the original error's stack trace to the new error
      if (error.stack != null) {
        newError.stack = (newError.stack ?? '') + '\n\nOriginal Stack Trace:\n' + error.stack
      }
      // Throw the new error
      throw newError
    } else {
      return value as T
    }
  }

  async #fetch (): Promise<void> {
    let value: T | null = null; let error: Error | null = null
    try {
      value = await this.#fetcher()
    } catch (e: any) {
      error = e
    }

    this.#validationState -= 1
    this.#value.next([value, error])

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
}
