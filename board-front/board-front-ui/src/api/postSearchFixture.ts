import { normalizeSearchKeyword } from '../search/normalizeSearchKeyword'
import type { PostSearchResult } from './postSearchService'

export const createPostSearchFixture = (keyword: string): PostSearchResult[] => {
  const normalizedKeyword = normalizeSearchKeyword(keyword)

  if (normalizedKeyword.length === 0) {
    return []
  }

  return [
    {
      postId: 1,
      title: `${normalizedKeyword} 검색 스코어링 예제`,
      contentPreview: 'Elasticsearch nori analyzer와 게시글 점수 계산을 연습하는 샘플입니다.',
      display: true,
      score: 9.75,
      highlights: {
        title: [`<em>${normalizedKeyword}</em> 검색 스코어링 예제`],
        content: [`Elasticsearch nori analyzer와 <em>${normalizedKeyword}</em> 점수 계산`],
      },
      scoringSignals: [
        {
          field: 'title',
          category: 'BM25_TEXT',
          label: '제목 원문',
          boost: 3,
          keyword: normalizedKeyword,
          description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
          applied: true,
        },
        {
          field: 'content',
          category: 'BM25_TEXT',
          label: '본문 원문',
          boost: 1,
          keyword: normalizedKeyword,
          description: '본문 원문 match는 제목보다 넓은 recall을 담당한다.',
          applied: true,
        },
      ],
    },
  ]
}
