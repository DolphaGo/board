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
    typeof explanation.totalSignalCount === 'number' &&
    Number.isInteger(explanation.totalSignalCount) &&
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
}
