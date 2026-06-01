import axios from 'axios'

export interface SearchRankingItem {
  keyword: string
  score: number
}

export const searchRankingService = {
  getRankings: async (limit = 10): Promise<SearchRankingItem[]> => {
    const response = await axios.get<SearchRankingItem[]>('/api/search/rankings', {
      params: { limit },
    })

    // 프론트 개발 서버만 켜진 상태에서는 /api 요청이 Vite fallback HTML을 받을 수 있다.
    // API 계약이 깨진 값을 그대로 렌더링하면 빈 순위 행이 생기므로 배열 여부를 먼저 확인한다.
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid search ranking response')
    }

    return response.data
  },
}
