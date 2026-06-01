import axios from 'axios'

export interface SearchRankingItem {
  keyword: string
  score: number
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

export const searchRankingService = {
  recordKeyword: async (keyword: string): Promise<void> => {
    // 랭킹 기록은 서버가 정규화한다. 프론트는 사용자가 입력한 원문을 보내고,
    // 같은 규칙을 여러 화면에 중복 구현하지 않는다.
    await axios.post('/api/search/rankings', {
      keyword,
    })
  },

  getRankings: async (limit = 10): Promise<SearchRankingItem[]> => {
    const response = await axios.get<SearchRankingItem[]>('/api/search/rankings', {
      params: { limit },
    })

    // 프론트 개발 서버만 켜진 상태에서는 /api 요청이 Vite fallback HTML을 받을 수 있다.
    // API 계약이 깨진 값을 그대로 렌더링하면 빈 순위 행이 생긴다.
    // 그래서 배열 여부, keyword/score 타입, 공백뿐인 keyword, 0 이상 정수 score를 함께 확인한다.
    if (!Array.isArray(response.data) || !response.data.every(isSearchRankingItem)) {
      throw new Error('Invalid search ranking response')
    }

    return response.data
  },
}
