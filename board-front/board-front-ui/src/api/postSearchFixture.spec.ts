import { normalizeSearchKeyword } from '../search/normalizeSearchKeyword'
import { createPostSearchFixture, createRelatedPostSearchFixture } from './postSearchFixture'

jest.mock('../search/normalizeSearchKeyword', () => ({
  normalizeSearchKeyword: jest.fn((keyword: string) => keyword.trim().replace(/\s+/g, ' ')),
}))

const mockedNormalizeSearchKeyword = normalizeSearchKeyword as jest.MockedFunction<typeof normalizeSearchKeyword>

describe('# Post search fixture', function () {
  beforeEach(() => {
    mockedNormalizeSearchKeyword.mockClear()
  })

  it('should create a scored search result with highlight snippets from keyword', function () {
    const results = createPostSearchFixture('kotlin spring')

    expect(results).toEqual([
      {
        postId: 1,
        title: 'kotlin spring 검색 스코어링 예제',
        contentPreview: 'Elasticsearch nori analyzer와 게시글 점수 계산을 연습하는 샘플입니다.',
        display: true,
        score: 9.75,
        highlights: {
          title: ['<em>kotlin spring</em> 검색 스코어링 예제'],
          content: ['Elasticsearch nori analyzer와 <em>kotlin spring</em> 점수 계산'],
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
          {
            field: 'content',
            category: 'BM25_TEXT',
            categoryDescription: 'BM25는 제목/본문 원문 일치의 기본 관련도입니다.',
            label: '본문 원문',
            boost: 1,
            keyword: 'kotlin spring',
            description: '본문 원문 match는 제목보다 넓은 recall을 담당한다.',
            applied: true,
          },
        ],
        scoreExplanation: {
          formula: 'final_score = bm25_text_score + function_score_bonus',
          finalScore: 9.75,
          appliedSignalCount: 2,
          totalSignalCount: 2,
          functionScoreApplied: false,
          formulaTerms: [
            {
              term: 'bm25_text_score',
              description: '제목/본문 원문 match가 만드는 BM25 관련도입니다.',
            },
          ],
          description: '로컬 fixture도 실제 검색 DTO처럼 BM25 기반 점수 설명을 포함합니다.',
        },
      },
    ])
  })

  it('should create related post recommendations without the current post id', function () {
    const results = createRelatedPostSearchFixture(999, 2)

    expect(results).toHaveLength(2)
    expect(results.map(result => result.postId)).not.toContain(999)
    expect(results[0]).toMatchObject({
      title: 'local fixture post #999 관련 추천',
      display: true,
      highlights: {},
      scoringSignals: [
        expect.objectContaining({
          categoryDescription: 'BM25는 현재 글과 후보 글의 제목/본문 유사도를 계산합니다.',
          applied: true,
        }),
      ],
      scoreExplanation: expect.objectContaining({
        formula: 'final_score = related_bm25_score + recency_bonus',
        functionScoreApplied: true,
      }),
    })
  })

  it('should normalize fixture keyword with the shared search normalizer', function () {
    createPostSearchFixture('  kotlin   spring  ')

    expect(mockedNormalizeSearchKeyword).toBeCalledWith('  kotlin   spring  ')
  })
})
