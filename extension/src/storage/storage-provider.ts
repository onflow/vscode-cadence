import { Memento } from 'vscode'

interface State {
  dismissedNotifications: string[]
}

export class StorageProvider {
  #globalState: Memento

  constructor (globalState: Memento) {
    this.#globalState = globalState
  }

  get<T extends keyof State>(key: T, fallback: State[T]): State[T] {
    return this.#globalState.get(key, fallback)
  }

  async set<T extends keyof State>(key: T, value: State[T]): Promise<void> {
    return await (this.#globalState.update(key, value) as Promise<void>)
  }
}
