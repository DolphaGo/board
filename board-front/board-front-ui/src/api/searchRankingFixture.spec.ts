import { createSearchRankingFixture } from './searchRankingFixture'

describe('# Search ranking fixture', function () {
  it('should create top ranking keywords up to the requested limit', function () {
    const rankings = createSearchRankingFixture(2)

    expect(rankings).toEqual([
      { keyword: 'kotlin spring', score: 12 },
      { keyword: 'elasticsearch nori', score: 8 },
    ])
  })
})
