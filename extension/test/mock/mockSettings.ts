import { BehaviorSubject, Observable, of, map, distinctUntilChanged } from 'rxjs'
import { CadenceConfiguration, Settings } from '../../src/settings/settings'
import { isEqual } from 'lodash'

export function getMockSettings (_settings$: BehaviorSubject<Partial<CadenceConfiguration>> | Partial<CadenceConfiguration> | null = null): Settings {
  const mockSettings: Settings = { getSettings, watch$ } as any

  function getSettings (): Partial<CadenceConfiguration> {
    if (!(_settings$ instanceof BehaviorSubject) && _settings$ != null) return _settings$

    return _settings$?.getValue() ?? ({
      flowCommand: 'flow',
      accessCheckMode: 'strict',
      customConfigPath: '',
      test: {
        maxConcurrency: 1
      }
    } as unknown as Partial<CadenceConfiguration>)
  }

  function watch$<T = CadenceConfiguration> (selector: (config: CadenceConfiguration) => T = (config) => config as unknown as T): Observable<T> {
    if (!(_settings$ instanceof BehaviorSubject)) return of()

    return _settings$.asObservable().pipe(
      map(selector as any),
      distinctUntilChanged(isEqual)
    )
  }
  return mockSettings
}
