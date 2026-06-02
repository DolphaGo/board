import axios from 'axios'

export interface PostSearchResult {
  postId: number
  title: string
  contentPreview: string
  display: boolean
  score: number
  highlights: Record<string, string[]>
  scoringSignals: PostSearchScoreSignal[]
  scoreExplanation?: PostSearchScoreExplanation
}

export interface PostSearchScoreExplanation {
  formula: string
  finalScore: number
  appliedSignalCount: number
  totalSignalCount: number
  functionScoreApplied: boolean
  description: string
}

export interface PostSearchScoreSignal {
  field: string
  category: string
  categoryDescription?: string
  label: string
  boost: number
  keyword: string
  description: string
  applied: boolean
}

export type PostSearchSource = 'direct' | 'header' | 'ranking' | 'suggestion'

export interface PostSearchOptions {
  size?: number
  source?: PostSearchSource
}

export interface RelatedPostSearchOptions {
  size?: number
}

const isHighlightMap = (data: unknown): data is Record<string, string[]> => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false
  }

  return Object.values(data).every(value =>
    Array.isArray(value) && value.every(item => typeof item === 'string')
  )
}

const isPostSearchResult = (data: unknown): data is PostSearchResult => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const result = data as Partial<PostSearchResult>
  return typeof result.postId === 'number' &&
    typeof result.title === 'string' &&
    typeof result.contentPreview === 'string' &&
    typeof result.display === 'boolean' &&
    typeof result.score === 'number' &&
    isHighlightMap(result.highlights) &&
    Array.isArray(result.scoringSignals) &&
    result.scoringSignals.every(isPostSearchScoreSignal) &&
    (result.scoreExplanation === undefined || isPostSearchScoreExplanation(result.scoreExplanation))
}

const isPostSearchScoreExplanation = (data: unknown): data is PostSearchScoreExplanation => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const explanation = data as Partial<PostSearchScoreExplanation>
  return typeof explanation.formula === 'string' &&
    explanation.formula.trim().length > 0 &&
    typeof explanation.finalScore === 'number' &&
    Number.isFinite(explanation.finalScore) &&
    typeof explanation.appliedSignalCount === 'number' &&
    Number.isInteger(explanation.appliedSignalCount) &&
    explanation.appliedSignalCount >= 0 &&
    typeof explanation.totalSignalCount === 'number' &&
    Number.isInteger(explanation.totalSignalCount) &&
    explanation.totalSignalCount >= 0 &&
    // 적용된 signal 수가 전체 signal 수보다 크면 UI가 "적용 2/1개" 같은 불가능한 학습 설명을 렌더링하게 된다.
    // ES 응답 경계에서 숫자 타입뿐 아니라 카운트의 의미 관계까지 검증한다.
    explanation.appliedSignalCount <= explanation.totalSignalCount &&
    typeof explanation.functionScoreApplied === 'boolean' &&
    typeof explanation.description === 'string' &&
    explanation.description.trim().length > 0
}

const isPostSearchScoreSignal = (data: unknown): data is PostSearchScoreSignal => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const signal = data as Partial<PostSearchScoreSignal>
  return typeof signal.field === 'string' &&
    signal.field.trim().length > 0 &&
    typeof signal.category === 'string' &&
    signal.category.trim().length > 0 &&
    typeof signal.categoryDescription === 'string' &&
    signal.categoryDescription.trim().length > 0 &&
    typeof signal.label === 'string' &&
    signal.label.trim().length > 0 &&
    typeof signal.boost === 'number' &&
    Number.isFinite(signal.boost) &&
    typeof signal.keyword === 'string' &&
    typeof signal.description === 'string' &&
    signal.description.trim().length > 0 &&
    typeof signal.applied === 'boolean'
}

export const postSearchService = {
  search: async (keyword: string, options: PostSearchOptions = {}): Promise<PostSearchResult[]> => {
    const size = options.size ?? 20
    const source = options.source ?? 'direct'
    const response = await axios.get<PostSearchResult[]>('/api/search/posts', {
      params: {
        keyword,
        size,
        source,
      },
    })

    // 백엔드가 꺼진 Vite 단독 실행에서는 HTML fallback이 올 수 있다.
    // ES 검색 결과는 score와 highlight 구조가 화면 렌더링에 직접 쓰이므로 항목 단위까지 확인한다.
    if (!Array.isArray(response.data) || !response.data.every(isPostSearchResult)) {
      throw new Error('Invalid post search response')
    }

    // 검색 쿼리는 백엔드에서 display=true를 필터링한다.
    // 그래도 ES 문서 갱신 지연이나 목업 응답이 섞일 수 있어 프론트 경계에서도 숨김 결과를 제외한다.
    return response.data.filter(result => result.display)
  },

  recommendRelatedPosts: async (
    postId: number,
    keyword: string,
    options: RelatedPostSearchOptions = {}
  ): Promise<PostSearchResult[]> => {
    const size = options.size ?? 3
    const response = await axios.get<PostSearchResult[]>(`/api/search/posts/${postId}/related`, {
      params: {
        keyword,
        size,
      },
    })

    // 관련 글 추천도 검색 결과와 같은 DTO를 사용한다.
    // scoreExplanation/scoringSignals를 그대로 검증하면 상세 화면에서 "왜 이 글이 추천됐는지"를 검색 학습 자료처럼 보여줄 수 있다.
    if (!Array.isArray(response.data) || !response.data.every(isPostSearchResult)) {
      throw new Error('Invalid post search response')
    }

    return response.data.filter(result => result.display && result.postId !== postId)
  },
}
