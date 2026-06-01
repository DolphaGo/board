import { ref } from 'vue'
import { searchRankingService, type SearchRankingItem } from 'src/api/searchRankingService'

interface SearchRankingOptions {
  getRankings?: () => Promise<SearchRankingItem[]>
}

export const createSearchRanking = (options: SearchRankingOptions = {}) => {
  const getRankings = options.getRankings ?? (() => searchRankingService.getRankings())
  const rankings = ref<SearchRankingItem[]>([])
  const loading = ref(false)
  const error = ref(false)
  const lastUpdatedAt = ref<Date | null>(null)

  const fetchRankings = async () => {
    // 이미 조회 중이면 같은 API를 한 번 더 호출하지 않는다.
    // 짧은 시간에 버튼을 여러 번 눌러도 Redis ranking 조회는 한 번만 나가게 하기 위함이다.
    if (loading.value) {
      return
    }

    try {
      loading.value = true
      error.value = false
      rankings.value = await getRankings()
      lastUpdatedAt.value = new Date()
    } catch (err) {
      console.error('검색어 순위 조회 실패:', err)
      error.value = true
    } finally {
      loading.value = false
    }
  }

  return {
    rankings,
    loading,
    error,
    lastUpdatedAt,
    fetchRankings,
  }
}
