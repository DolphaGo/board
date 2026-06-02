import axios from 'axios'

export interface SearchRankingItem {
  keyword: string
  score: number
  scoreDescription: string
}

export interface SearchSourceRankingItem {
  source: string
  label: string
  score: number
  description: string
}

export type SearchKeywordSuggestionMatchType = 'TEXT_PREFIX' | 'SYLLABLE_PREFIX' | 'INITIAL_PREFIX'

export interface SearchKeywordSuggestionItem {
  keyword: string
  score: number
  matchType: SearchKeywordSuggestionMatchType
  matchDescription: string
  inputToken: string
  keywordToken: string
}

const isSearchRankingItem = (data: unknown): data is SearchRankingItem => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const item = data as Partial<SearchRankingItem>
  return typeof item.keyword === 'string' &&
    item.keyword.trim().length > 0 &&
    typeof item.score === 'number' &&
    Number.isFinite(item.score) &&
    Number.isInteger(item.score) &&
    item.score >= 0 &&
    typeof item.scoreDescription === 'string' &&
    item.scoreDescription.trim().length > 0
}

const isSearchKeywordSuggestionMatchType = (data: unknown): data is SearchKeywordSuggestionMatchType =>
  data === 'TEXT_PREFIX' || data === 'SYLLABLE_PREFIX' || data === 'INITIAL_PREFIX'

const isSearchKeywordSuggestionItem = (data: unknown): data is SearchKeywordSuggestionItem => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const item = data as Partial<SearchKeywordSuggestionItem>
  return typeof item.keyword === 'string' &&
    item.keyword.trim().length > 0 &&
    typeof item.score === 'number' &&
    Number.isFinite(item.score) &&
    Number.isInteger(item.score) &&
    item.score >= 0 &&
    isSearchKeywordSuggestionMatchType(item.matchType) &&
    typeof item.matchDescription === 'string' &&
    item.matchDescription.trim().length > 0 &&
    typeof item.inputToken === 'string' &&
    item.inputToken.trim().length > 0 &&
    typeof item.keywordToken === 'string' &&
    item.keywordToken.trim().length > 0
}

const isSearchSourceRankingItem = (data: unknown): data is SearchSourceRankingItem => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const item = data as Partial<SearchSourceRankingItem>
  return typeof item.source === 'string' &&
    item.source.trim().length > 0 &&
    typeof item.label === 'string' &&
    item.label.trim().length > 0 &&
    typeof item.score === 'number' &&
    Number.isFinite(item.score) &&
    Number.isInteger(item.score) &&
    item.score >= 0 &&
    typeof item.description === 'string' &&
    item.description.trim().length > 0
}

// 서버의 SearchRankingService는 limit이 1 이상이어야 한다고 검증한다.
// 프론트 service도 같은 계약으로 정리해 두면 잘못된 값 때문에 500 응답을 만드는 일을 줄일 수 있다.
const normalizeSearchRankingLimit = (limit: number): number =>
  Number.isInteger(limit) && limit > 0 ? limit : 10

const normalizeSuggestionLimit = (limit: number): number =>
  Number.isInteger(limit) && limit > 0 ? limit : 5

export const searchRankingService = {
  recordKeyword: async (keyword: string): Promise<void> => {
    if (keyword.trim().length === 0) {
      return
    }

    // 랭킹 기록의 대소문자/공백 정규화는 서버가 담당한다.
    // 다만 빈 검색어는 서버에서도 400으로 거절하므로 프론트 service 경계에서 요청 자체를 줄인다.
    await axios.post('/api/search/rankings', {
      keyword,
    })
  },

  getRankings: async (limit = 10): Promise<SearchRankingItem[]> => {
    const normalizedLimit = normalizeSearchRankingLimit(limit)

    const response = await axios.get<SearchRankingItem[]>('/api/search/rankings', {
      params: { limit: normalizedLimit },
    })

    // 프론트 개발 서버만 켜진 상태에서는 /api 요청이 Vite fallback HTML을 받을 수 있다.
    // API 계약이 깨진 값을 그대로 렌더링하면 빈 순위 행이 생긴다.
    // 그래서 배열 여부, keyword/score 타입, 공백뿐인 keyword, 0 이상 정수 score, 점수 설명을 함께 확인한다.
    if (!Array.isArray(response.data) || !response.data.every(isSearchRankingItem)) {
      throw new Error('Invalid search ranking response')
    }

    return response.data
  },

  getSourceRankings: async (limit = 4): Promise<SearchSourceRankingItem[]> => {
    const normalizedLimit = normalizeSearchRankingLimit(limit)

    const response = await axios.get<SearchSourceRankingItem[]>('/api/search/rankings/sources', {
      params: { limit: normalizedLimit },
    })

    // source ranking은 keyword ranking과 같은 ZSET 기반 집계지만, 화면 학습 문구를 위해 label/description까지 필요하다.
    // 이 경계에서 응답 구조를 확인해 두면 백엔드 계약이 깨졌을 때 잘못된 통계 문구를 렌더링하지 않는다.
    if (!Array.isArray(response.data) || !response.data.every(isSearchSourceRankingItem)) {
      throw new Error('Invalid search ranking response')
    }

    return response.data
  },

  suggestKeywords: async (keyword: string, limit = 5): Promise<SearchKeywordSuggestionItem[]> => {
    const normalizedKeyword = keyword.trim()

    if (normalizedKeyword.length === 0) {
      return []
    }

    const normalizedLimit = normalizeSuggestionLimit(limit)
    const response = await axios.get<SearchKeywordSuggestionItem[]>('/api/search/rankings/suggestions', {
      params: {
        keyword: normalizedKeyword,
        limit: normalizedLimit,
      },
    })

    // 추천어는 랭킹 keyword/score에 더해 matchType, 설명, 입력/저장 토큰을 함께 내려온다.
    // matchDescription은 서버의 실제 prefix 판정 로직 옆에서 만든 문구라 화면별 설명 불일치를 줄인다.
    // inputToken/keywordToken은 "ㅋㅗ"가 어떤 저장 검색어 토큰과 prefix 비교됐는지 보여 주는 학습용 계약이다.
    if (!Array.isArray(response.data) || !response.data.every(isSearchKeywordSuggestionItem)) {
      throw new Error('Invalid search ranking response')
    }

    return response.data
  },
}
