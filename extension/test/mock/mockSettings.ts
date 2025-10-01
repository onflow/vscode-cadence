import { BehaviorSubject, Observable, of, map, distinctUntilChanged } from 'rxjs'
import { CadenceConfiguration, Settings } from '../../src/settings/settings'
import { isEqual } from 'lodash'

export function getMockSettings (_settings$: BehaviorSubject<Partial<CadenceConfiguration>> | Partial<CadenceConfiguration> | null = null): Settings {
  const mockSettings: Settings = { getSettings, watch$ } as any

  function buildConfig (partial?: Partial<CadenceConfiguration>): CadenceConfiguration {
    return {
      flowCommand: partial?.flowCommand ?? 'flow',
      accessCheckMode: partial?.accessCheckMode ?? 'strict',
      customConfigPath: partial?.customConfigPath ?? '',
      test: {
        maxConcurrency: partial?.test?.maxConcurrency ?? 1
      }
    }
  }

  function getSettings (): CadenceConfiguration {
    if (!(_settings$ instanceof BehaviorSubject) && _settings$ != null) return buildConfig(_settings$)

    return buildConfig(_settings$?.getValue())
  }

  function watch$<T = CadenceConfiguration> (selector: (config: CadenceConfiguration) => T = (config) => config as unknown as T): Observable<T> {
    if (!(_settings$ instanceof BehaviorSubject)) return of()

    return _settings$.asObservable().pipe(
      map((partial) => buildConfig(partial)),
      map(selector as any),
      distinctUntilChanged(isEqual)
    )
  }
  return mockSettings
}
