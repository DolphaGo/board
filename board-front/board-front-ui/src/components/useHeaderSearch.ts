import { ref } from 'vue'
import { normalizeSearchKeyword } from 'src/search/normalizeSearchKeyword'

interface HeaderSearchOptions {
  onSearch?: (keyword: string) => Promise<unknown> | unknown
}

export const createHeaderSearch = (options: HeaderSearchOptions = {}) => {
  const keyword = ref('')

  const submitSearch = async () => {
    const normalizedKeyword = normalizeSearchKeyword(keyword.value)

    if (normalizedKeyword.length === 0) {
      return
    }

    // 헤더는 검색어 입력과 라우팅만 맡는다.
    // 랭킹 기록은 SearchResults가 호출하는 /api/search/posts 성공 시 source와 함께 한 번 수행된다.
    // 여기서도 Redis 기록을 하면 header/suggestion 검색이 두 번 카운트되어 source 분석이 흐려진다.
    await options.onSearch?.(normalizedKeyword)
  }

  return {
    keyword,
    submitSearch,
  }
}
