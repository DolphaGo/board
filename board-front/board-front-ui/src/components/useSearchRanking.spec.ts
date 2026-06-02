import { createSearchRanking } from './useSearchRanking'

describe('# Search ranking behavior', function () {
  it('should ignore duplicate refresh requests while loading', async function () {
    let resolveRankings: (value: Array<{ keyword: string; score: number; scoreDescription: string }>) => void = () => {}
    const getRankings = jest.fn(() => new Promise<Array<{ keyword: string; score: number; scoreDescription: string }>>(resolve => {
      resolveRankings = resolve
    }))
    const { fetchRankings, loading, rankings } = createSearchRanking({ getRankings })

    const first = fetchRankings()
    const second = fetchRankings()

    expect(loading.value).toBe(true)
    expect(getRankings).toBeCalledTimes(1)

    resolveRankings([
      {
        keyword: 'kotlin spring',
        score: 12,
        scoreDescription: 'Redis ZSET score는 정규화된 검색어가 기록된 횟수입니다.',
      },
    ])
    await Promise.all([first, second])

    expect(loading.value).toBe(false)
    expect(rankings.value).toEqual([
      {
        keyword: 'kotlin spring',
        score: 12,
        scoreDescription: 'Redis ZSET score는 정규화된 검색어가 기록된 횟수입니다.',
      },
    ])
  })

  it('should record when rankings were refreshed successfully', async function () {
    const getRankings = jest.fn().mockResolvedValue([
      {
        keyword: 'kotlin spring',
        score: 12,
        scoreDescription: 'Redis ZSET score는 정규화된 검색어가 기록된 횟수입니다.',
      },
    ])
    const { fetchRankings, lastUpdatedAt } = createSearchRanking({ getRankings })

    expect(lastUpdatedAt.value).toBeNull()

    await fetchRankings()

    expect(lastUpdatedAt.value).toBeInstanceOf(Date)
  })
})
