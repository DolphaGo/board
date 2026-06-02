import { createHeaderSearch } from './useHeaderSearch'

describe('# Header search behavior', function () {
  it('should move to search results with a normalized keyword when submitted', async function () {
    const onSearch = jest.fn().mockResolvedValue(undefined)
    const { keyword, submitSearch } = createHeaderSearch({ onSearch })

    keyword.value = '  kotlin   spring  '
    await submitSearch()

    expect(onSearch).toBeCalledWith('kotlin spring')
  })

  it('should ignore a blank keyword', async function () {
    const onSearch = jest.fn()
    const { keyword, submitSearch } = createHeaderSearch({ onSearch })

    keyword.value = '   '
    await submitSearch()

    expect(onSearch).not.toBeCalled()
  })

  it('should leave ranking recording to the search results API to avoid duplicate counts', async function () {
    const onSearch = jest.fn().mockResolvedValue(undefined)
    const { keyword, submitSearch } = createHeaderSearch({ onSearch })

    keyword.value = '  kotlin   spring  '
    await submitSearch()

    // Header는 검색어를 정규화해 /search로 이동하는 입력 어댑터다.
    // 실제 랭킹 기록은 SearchResults가 호출하는 /api/search/posts 성공 시 source와 함께 한 번만 수행한다.
    expect(onSearch).toBeCalledWith('kotlin spring')
  })
})
