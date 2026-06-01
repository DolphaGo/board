import { ref } from 'vue'
import { searchRankingService } from 'src/api/searchRankingService'

interface HeaderSearchRecorder {
  recordKeyword: (keyword: string) => Promise<void>
}

const normalizeKeyword = (keyword: string): string => keyword.trim().replace(/\s+/g, ' ')

export const createHeaderSearch = (recorder: HeaderSearchRecorder = searchRankingService) => {
  const keyword = ref('')

  const submitSearch = async () => {
    const normalizedKeyword = normalizeKeyword(keyword.value)

    if (normalizedKeyword.length === 0) {
      return
    }

    try {
      // 실제 ES 검색 결과 화면은 다음 단계다. 지금은 사용자가 검색한 사실을
      // Redis 랭킹에 남기는 연결부터 검증 가능한 최소 단위로 만든다.
      await recorder.recordKeyword(normalizedKeyword)
    } catch (err) {
      // 랭킹 기록은 부가 기능이다. 기록 실패가 검색 입력 흐름 전체를 막으면 안 된다.
      console.error('검색어 랭킹 기록 실패:', err)
    }
  }

  return {
    keyword,
    submitSearch,
  }
}
