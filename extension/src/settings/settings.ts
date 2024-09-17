/* Workspace Settings */
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs'
import { workspace, Disposable, ConfigurationTarget } from 'vscode'
import { isEqual } from 'lodash'

const CONFIGURATION_KEY = 'cadence'

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
      if (e.affectsConfiguration(CONFIGURATION_KEY)) {
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
    return this.#configuration$.pipe(
      map(selector),
      distinctUntilChanged(isEqual)
    )
  }

  /**
   * Get the current configuration
   * @returns The current configuration
   */
  getSettings (): CadenceConfiguration {
    return this.#configuration$.value
  }

  async updateSettings (config: Partial<CadenceConfiguration>, target?: ConfigurationTarget): Promise<void> {
    // Recursively update all keys in the configuration
    async function update (section: string, obj: any): Promise<void> {
      await Promise.all(Object.entries(obj).map(async ([key, value]) => {
        const newKey = `${section}.${key}`
        if (typeof value === 'object' && !Array.isArray(value)) {
          await update(newKey, value)
        } else {
          await workspace.getConfiguration().update(newKey, value, target)
        }
      }))
    }

    await update(CONFIGURATION_KEY, config)
  }

  dispose (): void {
    this.#configuration$.complete()
  }

  #getConfiguration (): CadenceConfiguration {
    return workspace.getConfiguration(CONFIGURATION_KEY) as unknown as CadenceConfiguration
  }
}
