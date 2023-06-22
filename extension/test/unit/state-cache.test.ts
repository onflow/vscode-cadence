import assert = require('assert')
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

  test('Failed fetch generates error', async () => {
    const fetcher = async (): Promise<void> => {
      throw new Error('dummy error')
    }
    const stateCache = new StateCache(fetcher)

    await assert.rejects(async () => { await stateCache.getValue() }, { message: 'dummy error' })
  }).timeout(2000)
})
