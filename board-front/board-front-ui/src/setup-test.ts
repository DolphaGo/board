import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.spyOn(window.Storage.prototype, 'getItem').mockReturnValue('')
  vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => undefined)
})
vi.mock('src/config', () => ({
  CONFIG: {
    API_HOST: '',
  },
}))

// eslint-disable-next-line @typescript-eslint/no-empty-function
globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))

afterEach(() => {
  vi.clearAllMocks()
})
