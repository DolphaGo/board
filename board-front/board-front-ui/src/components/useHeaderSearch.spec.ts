import { createHeaderSearch } from './useHeaderSearch'

describe('# Header search behavior', function () {
  it('should record a normalized keyword when submitted', async function () {
    const recordKeyword = jest.fn().mockResolvedValue(undefined)
    const { keyword, submitSearch } = createHeaderSearch({ recorder: { recordKeyword } })

    keyword.value = '  kotlin   spring  '
    await submitSearch()

    expect(recordKeyword).toBeCalledWith('kotlin spring')
  })

  it('should notify ranking refresh after keyword recording succeeds', async function () {
    const recordKeyword = jest.fn().mockResolvedValue(undefined)
    const notifyRankingChanged = jest.fn()
    const { keyword, submitSearch } = createHeaderSearch({
      recorder: { recordKeyword },
      notifyRankingChanged,
    })

    keyword.value = 'kotlin'
    await submitSearch()

    expect(notifyRankingChanged).toBeCalledTimes(1)
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
    const notifyRankingChanged = jest.fn()
    const { keyword, rankingRecordError, submitSearch } = createHeaderSearch({
      recorder: { recordKeyword },
      notifyRankingChanged,
    })

    keyword.value = 'kotlin'

    try {
      await expect(submitSearch()).resolves.toBeUndefined()
      expect(consoleError).toBeCalled()
      expect(notifyRankingChanged).not.toBeCalled()
      expect(rankingRecordError.value).toBe(true)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('should clear ranking record failure after the next successful keyword recording', async function () {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const recordKeyword = jest
      .fn()
      .mockRejectedValueOnce(new Error('redis unavailable'))
      .mockResolvedValueOnce(undefined)
    const { keyword, rankingRecordError, submitSearch } = createHeaderSearch({
      recorder: { recordKeyword },
    })

    try {
      keyword.value = 'kotlin'
      await submitSearch()

      expect(rankingRecordError.value).toBe(true)

      keyword.value = 'spring'
      await submitSearch()

      expect(rankingRecordError.value).toBe(false)
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
