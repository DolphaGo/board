import axios from 'axios'

export interface PostSearchResult {
  postId: number
  title: string
  contentPreview: string
  score: number
  highlights: Record<string, string[]>
}

export const postSearchService = {
  search: async (keyword: string, size = 20): Promise<PostSearchResult[]> => {
    const response = await axios.get<PostSearchResult[]>('/api/search/posts', {
      params: {
        keyword,
        size,
      },
    })

    // 백엔드가 꺼진 Vite 단독 실행에서는 HTML fallback이 올 수 있다.
    // 검색 결과 화면이 깨진 데이터를 렌더링하지 않도록 API 배열 계약을 확인한다.
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid post search response')
    }

    return response.data
  },
}
