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
      score: 9.75,
      highlights: {
        title: [`<em>${normalizedKeyword}</em> 검색 스코어링 예제`],
        content: [`Elasticsearch nori analyzer와 <em>${normalizedKeyword}</em> 점수 계산`],
      },
    },
  ]
}
