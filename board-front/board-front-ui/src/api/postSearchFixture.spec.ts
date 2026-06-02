import { normalizeSearchKeyword } from '../search/normalizeSearchKeyword'
import { createPostSearchFixture } from './postSearchFixture'

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
            label: '제목 원문',
            boost: 3,
            keyword: 'kotlin spring',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
          {
            field: 'content',
            category: 'BM25_TEXT',
            label: '본문 원문',
            boost: 1,
            keyword: 'kotlin spring',
            description: '본문 원문 match는 제목보다 넓은 recall을 담당한다.',
            applied: true,
          },
        ],
      },
    ])
  })

  it('should normalize fixture keyword with the shared search normalizer', function () {
    createPostSearchFixture('  kotlin   spring  ')

    expect(mockedNormalizeSearchKeyword).toBeCalledWith('  kotlin   spring  ')
  })
})
