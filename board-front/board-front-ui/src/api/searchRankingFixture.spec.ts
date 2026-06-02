import { createSearchRankingFixture } from './searchRankingFixture'

describe('# Search ranking fixture', function () {
  it('should create top ranking keywords up to the requested limit', function () {
    const rankings = createSearchRankingFixture(2)

    expect(rankings).toEqual([
      {
        keyword: 'kotlin spring',
        score: 12,
        scoreDescription: 'Redis ZSET score는 최근 30분 동안 정규화된 검색어가 기록된 횟수입니다.',
      },
      {
        keyword: 'elasticsearch nori',
        score: 8,
        scoreDescription: 'Redis ZSET score는 최근 30분 동안 정규화된 검색어가 기록된 횟수입니다.',
      },
    ])
  })
})
