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
          display: true,
          score: 10.5,
          highlights: {
            title: ['<em>kotlin</em> spring'],
          },
          scoringSignals: [
            {
              field: 'title',
              category: 'BM25_TEXT',
              categoryDescription: 'BM25는 제목/본문 원문 일치의 기본 관련도입니다.',
              label: '제목 원문',
              boost: 3,
              keyword: 'kotlin spring',
              description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
              applied: true,
            },
          ],
          scoreExplanation: {
            formula: 'final_score = bm25_text_score + function_score_bonus',
            finalScore: 10.5,
            appliedSignalCount: 1,
            totalSignalCount: 1,
            functionScoreApplied: false,
            description: 'Elasticsearch 최종 점수는 BM25 기반 텍스트 관련도에 운영 가산점을 더한 값이다.',
          },
        },
      ],
    })

    const results = await postSearchService.search('kotlin spring')

    expect(mockedAxios.get).toBeCalledWith('/api/search/posts', {
      params: {
        keyword: 'kotlin spring',
        size: 20,
        source: 'direct',
      },
    })
    expect(results).toHaveLength(1)
    expect(results[0].display).toBe(true)
    expect(results[0].scoringSignals).toEqual([
      {
        field: 'title',
        category: 'BM25_TEXT',
        categoryDescription: 'BM25는 제목/본문 원문 일치의 기본 관련도입니다.',
        label: '제목 원문',
        boost: 3,
        keyword: 'kotlin spring',
        description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
        applied: true,
      },
    ])
    expect(results[0].scoreExplanation).toEqual({
      formula: 'final_score = bm25_text_score + function_score_bonus',
      finalScore: 10.5,
      appliedSignalCount: 1,
      totalSignalCount: 1,
      functionScoreApplied: false,
      description: 'Elasticsearch 최종 점수는 BM25 기반 텍스트 관련도에 운영 가산점을 더한 값이다.',
    })
  })

  it('should include the search source when requesting post search results', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [],
    })

    await postSearchService.search('kotlin spring', { source: 'suggestion' })

    expect(mockedAxios.get).toBeCalledWith('/api/search/posts', {
      params: {
        keyword: 'kotlin spring',
        size: 20,
        source: 'suggestion',
      },
    })
  })

  it('should request related post recommendations with current post id and keyword', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          postId: 11,
          title: '코틀린 BM25 추천',
          contentPreview: '현재 글과 같은 검색 스코어링 계열',
          display: true,
          score: 8.5,
          highlights: {
            title: ['<em>코틀린</em> BM25 추천'],
          },
          scoringSignals: [
            {
              field: 'title',
              category: 'BM25_TEXT',
              categoryDescription: 'BM25는 제목/본문 원문 일치의 기본 관련도입니다.',
              label: '제목 원문',
              boost: 3,
              keyword: '코틀린 검색',
              description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
              applied: true,
            },
          ],
          scoreExplanation: {
            formula: 'final_score = bm25_text_score + function_score_bonus',
            finalScore: 8.5,
            appliedSignalCount: 1,
            totalSignalCount: 1,
            functionScoreApplied: false,
            description: '관련 글 추천 점수 설명',
          },
        },
      ],
    })

    const results = await postSearchService.recommendRelatedPosts(10, '코틀린 검색', { size: 4 })

    expect(mockedAxios.get).toBeCalledWith('/api/search/posts/10/related', {
      params: {
        keyword: '코틀린 검색',
        size: 4,
      },
    })
    expect(results).toHaveLength(1)
    expect(results[0].postId).toBe(11)
  })

  it('should ignore hidden post search results when the API returns mixed display states', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          postId: 1,
          title: 'visible kotlin spring',
          contentPreview: 'Visible Elasticsearch scoring example',
          display: true,
          score: 10.5,
          highlights: {},
          scoringSignals: [],
        },
        {
          postId: 2,
          title: 'hidden kotlin spring',
          contentPreview: 'Hidden Elasticsearch scoring example',
          display: false,
          score: 11.5,
          highlights: {},
          scoringSignals: [],
        },
      ],
    })

    const results = await postSearchService.search('kotlin spring')

    expect(results).toHaveLength(1)
    expect(results[0].postId).toBe(1)
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
          display: true,
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
          display: true,
          score: 10.5,
          highlights: {},
          scoringSignals: [
            {
              field: 'title',
              category: 'BM25_TEXT',
              label: '제목 원문',
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

  it('should reject scoring signals without a category description', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          postId: 1,
          title: 'kotlin spring',
          contentPreview: 'Elasticsearch scoring example',
          display: true,
          score: 10.5,
          highlights: {},
          scoringSignals: [
            {
              field: 'title',
              category: 'BM25_TEXT',
              label: '제목 원문',
              boost: 3,
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

  it('should reject post search arrays with malformed score explanations', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          postId: 1,
          title: 'kotlin spring',
          contentPreview: 'Elasticsearch scoring example',
          display: true,
          score: 10.5,
          highlights: {},
          scoringSignals: [],
          scoreExplanation: {
            formula: 'final_score = bm25',
            finalScore: '10.5',
            appliedSignalCount: 1,
            totalSignalCount: 1,
            functionScoreApplied: false,
            description: '점수 설명',
          },
        },
      ],
    })

    await expect(postSearchService.search('kotlin')).rejects.toThrow('Invalid post search response')
  })

  it('should reject score explanations whose applied signal count exceeds total signals', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          postId: 1,
          title: 'kotlin spring',
          contentPreview: 'Elasticsearch scoring example',
          display: true,
          score: 10.5,
          highlights: {},
          scoringSignals: [],
          scoreExplanation: {
            formula: 'final_score = bm25',
            finalScore: 10.5,
            appliedSignalCount: 2,
            totalSignalCount: 1,
            functionScoreApplied: false,
            description: '적용 signal 수가 전체 signal 수보다 크면 점수 설명으로 신뢰할 수 없다.',
          },
        },
      ],
    })

    await expect(postSearchService.search('kotlin')).rejects.toThrow('Invalid post search response')
  })
})
