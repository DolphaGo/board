import { createSearchRanking } from './useSearchRanking'

describe('# Search ranking behavior', function () {
  it('should ignore duplicate refresh requests while loading', async function () {
    let resolveRankings: (value: Array<{ keyword: string; score: number }>) => void = () => {}
    const getRankings = jest.fn(() => new Promise<Array<{ keyword: string; score: number }>>(resolve => {
      resolveRankings = resolve
    }))
    const { fetchRankings, loading, rankings } = createSearchRanking({ getRankings })

    const first = fetchRankings()
    const second = fetchRankings()

    expect(loading.value).toBe(true)
    expect(getRankings).toBeCalledTimes(1)

    resolveRankings([{ keyword: 'kotlin spring', score: 12 }])
    await Promise.all([first, second])

    expect(loading.value).toBe(false)
    expect(rankings.value).toEqual([{ keyword: 'kotlin spring', score: 12 }])
  })

  it('should record when rankings were refreshed successfully', async function () {
    const getRankings = jest.fn().mockResolvedValue([
      { keyword: 'kotlin spring', score: 12 },
    ])
    const { fetchRankings, lastUpdatedAt } = createSearchRanking({ getRankings })

    expect(lastUpdatedAt.value).toBeNull()

    await fetchRankings()

    expect(lastUpdatedAt.value).toBeInstanceOf(Date)
  })
})
