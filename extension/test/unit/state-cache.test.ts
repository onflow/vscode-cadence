import { StateCache } from '../../src/utils/state-cache'
import { ASSERT_EQUAL } from '../globals'

suite('State Cache Unit Tests', () => {
  test('Returns value when valid', async () => {
    const fetcher = async (): Promise<number> => {
      return val
    }
    const val = 0
    const stateCache = new StateCache(fetcher)

    ASSERT_EQUAL(await stateCache.getValue(), 0)
  })

  test('Returns value when invalid', async () => {
    const fetcher = async (): Promise<number> => {
      return val
    }
    let val = 0
    const stateCache = new StateCache(fetcher)

    val += 1
    stateCache.invalidate()

    ASSERT_EQUAL(await stateCache.getValue(), 1)
  })

  test('Returns value when invalid and fetching', async () => {
    const fetcher = async (): Promise<number> => {
      return val
    }
    let val = 0
    const stateCache = new StateCache(fetcher)
    
    val += 1
    stateCache.invalidate()

    val += 1
    stateCache.invalidate()

    ASSERT_EQUAL(await stateCache.getValue(), 2)
  })

  test('Multiple invalidation calls will bubble', async () => {
    const fetcher = async (): Promise<number> => {
      fetcherCallCount++
      const returnVal = val
      return await new Promise<number>((resolve) => {
        setTimeout(() => {
          resolve(returnVal)
        }, 1000)
      })
    }
    let fetcherCallCount = 0
    let val = 0
    const stateCache = new StateCache(fetcher)

    val += 1
    stateCache.invalidate()

    val += 1
    stateCache.invalidate()

    val += 1
    stateCache.invalidate()

    ASSERT_EQUAL(await stateCache.getValue(), 3)
    ASSERT_EQUAL(fetcherCallCount, 2)
  }).timeout(5000)

  test('Retries failed fetch', async () => {
    const fetcher = async (): Promise<string> => {
      count++
      if (count === 1) throw new Error('Fetch failed')
      else return "foobar"
    }
    let count = 0
    const stateCache = new StateCache(fetcher)

    ASSERT_EQUAL(await stateCache.getValue(), "foobar")
  }).timeout(2000)
})
