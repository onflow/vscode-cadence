import { BehaviorSubject, Observable, of, map, distinctUntilChanged, skip } from 'rxjs'
import { CadenceConfiguration, Settings } from '../../src/settings/settings'
import * as path from 'path'
import { isEqual } from 'lodash'

export function getMockSettings (settings$: BehaviorSubject<Partial<CadenceConfiguration>> | Partial<CadenceConfiguration> | null = null): Settings {
  const mockSettings: Settings = { getSettings, watch$ } as any

  function getSettings (): Partial<CadenceConfiguration> {
    if (!(settings$ instanceof BehaviorSubject) && settings$ != null) return settings$

    return settings$?.getValue() ?? {
      flowCommand: 'flow',
      accessCheckMode: 'strict',
      customConfigPath: path.join(__dirname, '../integration/fixtures/workspace/flow.json'),
      test: {
        maxConcurrency: 1
      }
    }
  }

  function watch$<T = CadenceConfiguration> (selector: (config: CadenceConfiguration) => T = (config) => config as unknown as T): Observable<T> {
    if (!(settings$ instanceof BehaviorSubject)) return of()

    return settings$.asObservable().pipe(
      skip(1),
      map(selector as any),
      distinctUntilChanged(isEqual)
    )
  }
  return mockSettings
}
