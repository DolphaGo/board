import { vi, type Mock } from 'vitest'

type LocalStorageKey = 'getItem' | 'setItem' | 'removeItem'

export default function mockLocalStorage<T> (key: LocalStorageKey, data?: T, stringify = true): Mock {
  const fn = vi.fn().mockReturnValue(stringify ? JSON.stringify(data) : data)
  // use __proto__ because jsdom bug: https://github.com/facebook/jest/issues/6798#issuecomment-412871616
  // eslint-disable-next-line no-proto
  globalThis.localStorage.__proto__[key] = fn
  return fn
}
