import { normalizeSearchKeyword } from '../search/normalizeSearchKeyword'
import type { PostSearchResult } from './postSearchService'

const BM25_CATEGORY_DESCRIPTION = 'BM25는 제목/본문 원문 일치의 기본 관련도입니다.'

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
          categoryDescription: BM25_CATEGORY_DESCRIPTION,
          label: '제목 원문',
          boost: 3,
          keyword: normalizedKeyword,
          description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
          applied: true,
        },
        {
          field: 'content',
          category: 'BM25_TEXT',
          categoryDescription: BM25_CATEGORY_DESCRIPTION,
          label: '본문 원문',
          boost: 1,
          keyword: normalizedKeyword,
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
  ]
}

export const createRelatedPostSearchFixture = (postId: number, size = 3): PostSearchResult[] => {
  const relatedPostIds = [postId + 1, postId + 2, postId + 3].slice(0, Math.max(size, 0))

  return relatedPostIds.map((relatedPostId, index) => ({
    postId: relatedPostId,
    title: `local fixture post #${postId} 관련 추천`,
    contentPreview: '현재 글의 제목/본문과 BM25 점수가 높은 로컬 추천 샘플입니다.',
    display: true,
    score: 8.75 - index,
    highlights: {},
    scoringSignals: [
      {
        field: 'title_content',
        category: 'RELATED_BM25',
        categoryDescription: 'BM25는 현재 글과 후보 글의 제목/본문 유사도를 계산합니다.',
        label: '현재 글 기반 유사도',
        boost: 2,
        keyword: `post:${postId}`,
        description: '현재 게시글의 제목/본문에서 뽑은 검색어로 후보 글을 다시 검색한 추천 신호입니다.',
        applied: true,
      },
    ],
    scoreExplanation: {
      formula: 'final_score = related_bm25_score + recency_bonus',
      finalScore: 8.75 - index,
      appliedSignalCount: 1,
      totalSignalCount: 1,
      functionScoreApplied: true,
      formulaTerms: [
        {
          term: 'related_bm25_score',
          description: '현재 글과 후보 글의 제목/본문 유사도가 만드는 BM25 관련도입니다.',
        },
        {
          term: 'recency_bonus',
          description: '최근 작성된 글을 소폭 올려 관련 글 목록을 살아 있게 만드는 가산점입니다.',
        },
      ],
      description: '로컬 추천 fixture는 현재 글 기반 BM25 점수와 최신성 보너스를 함께 보여줍니다.',
    },
  }))
}
