/* Workspace Settings */
import { BehaviorSubject, Observable, distinctUntilChanged, map, skip } from 'rxjs'
import { workspace, Disposable } from 'vscode'
import { isEqual } from 'lodash'

// Schema for the cadence configuration
export interface CadenceConfiguration {
  flowCommand: string
  accessCheckMode: string
  customConfigPath: string
  test: {
    maxConcurrency: number
  }
}

export class Settings implements Disposable {
  #configuration$: BehaviorSubject<CadenceConfiguration> = new BehaviorSubject<CadenceConfiguration>(this.#getConfiguration())
  #disposables: Disposable[] = []

  constructor () {
    // Watch for configuration changes
    this.#disposables.push(workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cadence')) {
        this.#configuration$.next(this.#getConfiguration())
      }
    }))
  }

  /**
   * Returns an observable that emits whenever the configuration changes.  If a selector is provided, the observable
   * will only emit when the selected value changes.
   *
   * @param selector A function that selects a value from the configuration
   * @returns An observable that emits whenever the configuration changes
   * @template T The type of the selected value
   * @example
   * // Emit whenever the flow command changes
   * settings.watch$(config => config.flowCommand)
   */
  watch$<T = CadenceConfiguration> (selector: (config: CadenceConfiguration) => T = (config) => config as unknown as T): Observable<T> {
    return this.#configuration$.asObservable().pipe(
      skip(1),
      map(selector),
      distinctUntilChanged(isEqual)
    )
  }

  /**
   * Returns the current configuration
   *
   * @returns The current configuration
   */
  getSettings (): CadenceConfiguration {
    return this.#configuration$.value
  }

  dispose (): void {
    this.#configuration$.complete()
  }

  #getConfiguration (): CadenceConfiguration {
    return workspace.getConfiguration('cadence') as unknown as CadenceConfiguration
  }
}
