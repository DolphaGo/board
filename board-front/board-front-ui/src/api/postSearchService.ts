import axios from 'axios'

export interface PostSearchResult {
  postId: number
  title: string
  contentPreview: string
  score: number
  highlights: Record<string, string[]>
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
    typeof result.score === 'number' &&
    isHighlightMap(result.highlights)
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
    // ES 검색 결과는 score와 highlight 구조가 화면 렌더링에 직접 쓰이므로 항목 단위까지 확인한다.
    if (!Array.isArray(response.data) || !response.data.every(isPostSearchResult)) {
      throw new Error('Invalid post search response')
    }

    return response.data
  },
}
