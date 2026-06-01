import { createHeaderSearch } from './useHeaderSearch'

describe('# Header search behavior', function () {
  it('should record a normalized keyword when submitted', async function () {
    const recordKeyword = jest.fn().mockResolvedValue(undefined)
    const { keyword, submitSearch } = createHeaderSearch({ recordKeyword })

    keyword.value = '  kotlin   spring  '
    await submitSearch()

    expect(recordKeyword).toBeCalledWith('kotlin spring')
  })

  it('should ignore a blank keyword', async function () {
    const recordKeyword = jest.fn().mockResolvedValue(undefined)
    const { keyword, submitSearch } = createHeaderSearch({ recordKeyword })

    keyword.value = '   '
    await submitSearch()

    expect(recordKeyword).not.toBeCalled()
  })

  it('should not throw when keyword recording fails', async function () {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const recordKeyword = jest.fn().mockRejectedValue(new Error('redis unavailable'))
    const { keyword, submitSearch } = createHeaderSearch({ recordKeyword })

    keyword.value = 'kotlin'

    try {
      await expect(submitSearch()).resolves.toBeUndefined()
      expect(consoleError).toBeCalled()
    } finally {
      consoleError.mockRestore()
    }
  })
})
