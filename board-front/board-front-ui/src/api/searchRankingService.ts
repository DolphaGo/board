import axios from 'axios'

export interface SearchRankingItem {
  keyword: string
  score: number
}

export type SearchKeywordSuggestionMatchType = 'TEXT_PREFIX' | 'SYLLABLE_PREFIX' | 'INITIAL_PREFIX'

export interface SearchKeywordSuggestionItem extends SearchRankingItem {
  matchType: SearchKeywordSuggestionMatchType
  matchDescription: string
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
    item.score >= 0
}

const isSearchKeywordSuggestionMatchType = (data: unknown): data is SearchKeywordSuggestionMatchType =>
  data === 'TEXT_PREFIX' || data === 'SYLLABLE_PREFIX' || data === 'INITIAL_PREFIX'

const isSearchKeywordSuggestionItem = (data: unknown): data is SearchKeywordSuggestionItem => {
  if (!isSearchRankingItem(data)) {
    return false
  }

  const item = data as Partial<SearchKeywordSuggestionItem>
  return isSearchKeywordSuggestionMatchType(item.matchType) &&
    typeof item.matchDescription === 'string' &&
    item.matchDescription.trim().length > 0
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
    // 그래서 배열 여부, keyword/score 타입, 공백뿐인 keyword, 0 이상 정수 score를 함께 확인한다.
    if (!Array.isArray(response.data) || !response.data.every(isSearchRankingItem)) {
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

    // 추천어는 랭킹 keyword/score에 더해 matchType과 matchDescription을 함께 내려온다.
    // matchDescription은 서버의 실제 prefix 판정 로직 옆에서 만든 문구라 화면별 설명 불일치를 줄인다.
    if (!Array.isArray(response.data) || !response.data.every(isSearchKeywordSuggestionItem)) {
      throw new Error('Invalid search ranking response')
    }

    return response.data
  },
}
