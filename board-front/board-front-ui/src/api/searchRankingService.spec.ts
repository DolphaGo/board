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

  it('should record a searched keyword', async function () {
    mockedAxios.post.mockResolvedValue({})

    await searchRankingService.recordKeyword('kotlin spring')

    expect(mockedAxios.post).toBeCalledWith('/api/search/rankings', {
      keyword: 'kotlin spring',
    })
  })
})
