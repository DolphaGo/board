import { createHeaderSearch } from './useHeaderSearch'

describe('# Header search behavior', function () {
  it('should record a normalized keyword when submitted', async function () {
    const recordKeyword = jest.fn().mockResolvedValue(undefined)
    const { keyword, submitSearch } = createHeaderSearch({ recorder: { recordKeyword } })

    keyword.value = '  kotlin   spring  '
    await submitSearch()

    expect(recordKeyword).toBeCalledWith('kotlin spring')
  })

  it('should ignore a blank keyword', async function () {
    const recordKeyword = jest.fn().mockResolvedValue(undefined)
    const onSearch = jest.fn()
    const { keyword, submitSearch } = createHeaderSearch({ recorder: { recordKeyword }, onSearch })

    keyword.value = '   '
    await submitSearch()

    expect(recordKeyword).not.toBeCalled()
    expect(onSearch).not.toBeCalled()
  })

  it('should not throw when keyword recording fails', async function () {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const recordKeyword = jest.fn().mockRejectedValue(new Error('redis unavailable'))
    const { keyword, submitSearch } = createHeaderSearch({ recorder: { recordKeyword } })

    keyword.value = 'kotlin'

    try {
      await expect(submitSearch()).resolves.toBeUndefined()
      expect(consoleError).toBeCalled()
    } finally {
      consoleError.mockRestore()
    }
  })

  it('should move to search results even when ranking recording fails', async function () {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const recordKeyword = jest.fn().mockRejectedValue(new Error('redis unavailable'))
    const onSearch = jest.fn().mockResolvedValue(undefined)
    const { keyword, submitSearch } = createHeaderSearch({ recorder: { recordKeyword }, onSearch })

    keyword.value = '  kotlin   spring  '

    try {
      await submitSearch()

      expect(onSearch).toBeCalledWith('kotlin spring')
    } finally {
      consoleError.mockRestore()
    }
  })
})
