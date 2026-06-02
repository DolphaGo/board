import axios from 'axios'
import { searchRankingService } from './searchRankingService'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('# Search ranking service', function () {
  it('should request top 10 search rankings by default', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        { keyword: 'kotlin', score: 7 },
        { keyword: 'spring boot', score: 3 },
      ],
    })

    const rankings = await searchRankingService.getRankings()

    expect(mockedAxios.get).toBeCalledWith('/api/search/rankings', {
      params: { limit: 10 },
    })
    expect(rankings).toEqual([
      { keyword: 'kotlin', score: 7 },
      { keyword: 'spring boot', score: 3 },
    ])
  })

  it.each([0, -1, 1.5, Number.NaN])('should use default ranking limit for invalid limit: %s', async function (limit) {
    mockedAxios.get.mockResolvedValue({
      data: [],
    })

    await searchRankingService.getRankings(limit)

    expect(mockedAxios.get).toBeCalledWith('/api/search/rankings', {
      params: { limit: 10 },
    })
  })

  it('should request search keyword suggestions with keyword and limit', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        { keyword: 'kotlin spring', score: 7, matchType: 'TEXT_PREFIX' },
      ],
    })

    const suggestions = await searchRankingService.suggestKeywords('kotlin', 5)

    expect(mockedAxios.get).toBeCalledWith('/api/search/rankings/suggestions', {
      params: {
        keyword: 'kotlin',
        limit: 5,
      },
    })
    expect(suggestions).toEqual([
      { keyword: 'kotlin spring', score: 7, matchType: 'TEXT_PREFIX' },
    ])
  })

  it('should ignore blank search keyword suggestions', async function () {
    const suggestions = await searchRankingService.suggestKeywords('   ')

    expect(mockedAxios.get).not.toBeCalled()
    expect(suggestions).toEqual([])
  })

  it('should reject malformed ranking responses', async function () {
    mockedAxios.get.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(searchRankingService.getRankings()).rejects.toThrow('Invalid search ranking response')
  })

  it('should reject ranking arrays with malformed items', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        { keyword: 'kotlin', score: '7' },
      ],
    })

    await expect(searchRankingService.getRankings()).rejects.toThrow('Invalid search ranking response')
  })

  it('should reject suggestion arrays without match type', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        { keyword: 'kotlin spring', score: 7 },
      ],
    })

    await expect(searchRankingService.suggestKeywords('kotlin')).rejects.toThrow('Invalid search ranking response')
  })

  it('should reject ranking arrays with blank keywords', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        { keyword: '   ', score: 7 },
      ],
    })

    await expect(searchRankingService.getRankings()).rejects.toThrow('Invalid search ranking response')
  })

  it('should reject ranking arrays with non-finite scores', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        { keyword: 'kotlin', score: Number.NaN },
      ],
    })

    await expect(searchRankingService.getRankings()).rejects.toThrow('Invalid search ranking response')
  })

  it.each([-1, 1.5])('should reject ranking arrays with invalid score contract: %s', async function (score) {
    mockedAxios.get.mockResolvedValue({
      data: [
        { keyword: 'kotlin', score },
      ],
    })

    await expect(searchRankingService.getRankings()).rejects.toThrow('Invalid search ranking response')
  })

  it('should record a searched keyword', async function () {
    mockedAxios.post.mockResolvedValue({})

    await searchRankingService.recordKeyword('kotlin spring')

    expect(mockedAxios.post).toBeCalledWith('/api/search/rankings', {
      keyword: 'kotlin spring',
    })
  })

  it('should ignore blank searched keyword', async function () {
    await searchRankingService.recordKeyword('   ')

    expect(mockedAxios.post).not.toBeCalled()
  })
})
