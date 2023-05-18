import { BehaviorSubject, filter, firstValueFrom } from 'rxjs'

export class EmulatorStateData<T> {
  valid$: BehaviorSubject<boolean>
  #value: T

  constructor (initialData: T, valid: boolean = false) {
    this.valid$ = new BehaviorSubject<boolean>(valid)
    this.#value = initialData
  }

  setValue (data: T): void {
    this.#value = data
    this.valid$.next(true)
  }

  async getValue (): Promise<T> {
    // Wait for data to be valid then return
    return await firstValueFrom(this.valid$.pipe(filter(x => x))).then(() => this.#value)
  }

  invalidate (): void {
    this.valid$.next(false)
  }
}
