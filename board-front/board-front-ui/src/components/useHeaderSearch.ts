import { ref } from 'vue'
import { searchRankingService } from 'src/api/searchRankingService'
import { notifySearchRankingChanged } from './searchRankingRefreshEvent'

interface HeaderSearchRecorder {
  recordKeyword: (keyword: string) => Promise<void>
}

interface HeaderSearchOptions {
  recorder?: HeaderSearchRecorder
  notifyRankingChanged?: () => void
  onSearch?: (keyword: string) => Promise<unknown> | unknown
}

const normalizeKeyword = (keyword: string): string => keyword.trim().replace(/\s+/g, ' ')

export const createHeaderSearch = (options: HeaderSearchOptions = {}) => {
  const recorder = options.recorder ?? searchRankingService
  const notifyRankingChanged = options.notifyRankingChanged ?? notifySearchRankingChanged
  const keyword = ref('')

  const submitSearch = async () => {
    const normalizedKeyword = normalizeKeyword(keyword.value)

    if (normalizedKeyword.length === 0) {
      return
    }

    try {
      // 랭킹 기록은 검색 결과 이동과 독립된 부가 기록이다.
      // Redis가 잠시 실패해도 사용자는 검색 결과 화면으로 계속 이동해야 한다.
      await recorder.recordKeyword(normalizedKeyword)
      // Redis 랭킹 점수가 올라간 직후 사이드바가 30초 polling을 기다리지 않고 다시 읽게 한다.
      notifyRankingChanged()
    } catch (err) {
      // 랭킹 기록은 부가 기능이다. 기록 실패가 검색 입력 흐름 전체를 막으면 안 된다.
      console.error('검색어 랭킹 기록 실패:', err)
    }

    await options.onSearch?.(normalizedKeyword)
  }

  return {
    keyword,
    submitSearch,
  }
}
