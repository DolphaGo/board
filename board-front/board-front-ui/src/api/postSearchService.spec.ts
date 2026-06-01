import axios from 'axios'
import { postSearchService } from './postSearchService'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('# Post search service', function () {
  it('should request post search results with keyword and default size', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          postId: 1,
          title: 'kotlin spring',
          contentPreview: 'Elasticsearch scoring example',
          score: 10.5,
          highlights: {
            title: ['<em>kotlin</em> spring'],
          },
          scoringSignals: [
            {
              field: 'title',
              boost: 3,
              keyword: 'kotlin spring',
              description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
              applied: true,
            },
          ],
        },
      ],
    })

    const results = await postSearchService.search('kotlin spring')

    expect(mockedAxios.get).toBeCalledWith('/api/search/posts', {
      params: {
        keyword: 'kotlin spring',
        size: 20,
      },
    })
    expect(results).toHaveLength(1)
    expect(results[0].scoringSignals).toEqual([
      {
        field: 'title',
        boost: 3,
        keyword: 'kotlin spring',
        description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
        applied: true,
      },
    ])
  })

  it('should reject malformed post search responses', async function () {
    mockedAxios.get.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(postSearchService.search('kotlin')).rejects.toThrow('Invalid post search response')
  })

  it('should reject post search arrays with malformed result items', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          postId: 1,
          title: 'kotlin spring',
          contentPreview: 'Elasticsearch scoring example',
          score: '10.5',
          highlights: {
            title: '<em>kotlin</em> spring',
          },
          scoringSignals: [],
        },
      ],
    })

    await expect(postSearchService.search('kotlin')).rejects.toThrow('Invalid post search response')
  })

  it('should reject post search arrays without valid scoring signals', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          postId: 1,
          title: 'kotlin spring',
          contentPreview: 'Elasticsearch scoring example',
          score: 10.5,
          highlights: {},
          scoringSignals: [
            {
              field: 'title',
              boost: '3',
              keyword: 'kotlin spring',
              description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
              applied: true,
            },
          ],
        },
      ],
    })

    await expect(postSearchService.search('kotlin')).rejects.toThrow('Invalid post search response')
  })
})
