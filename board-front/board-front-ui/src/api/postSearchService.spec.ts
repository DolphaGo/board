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
        },
      ],
    })

    await expect(postSearchService.search('kotlin')).rejects.toThrow('Invalid post search response')
  })
})
