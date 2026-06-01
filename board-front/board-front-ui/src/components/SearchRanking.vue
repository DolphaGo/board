<template>
  <section class="search-ranking" aria-labelledby="search-ranking-title">
    <div class="ranking-header">
      <h3 id="search-ranking-title">실시간 검색어</h3>
      <button type="button" class="refresh-button" @click="fetchRankings">새로고침</button>
    </div>

    <p v-if="loading" class="ranking-message">불러오는 중...</p>
    <p v-else-if="error" class="ranking-message">검색어 순위를 불러오지 못했습니다.</p>
    <p v-else-if="rankings.length === 0" class="ranking-message">아직 검색 기록이 없습니다.</p>

    <ol v-else class="ranking-list">
      <li v-for="(item, index) in rankings" :key="item.keyword" class="ranking-item">
        <span class="rank-number">{{ index + 1 }}</span>
        <span class="rank-keyword">{{ item.keyword }}</span>
        <span class="rank-score">{{ item.score }}</span>
      </li>
    </ol>
  </section>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { searchRankingService, type SearchRankingItem } from 'src/api/searchRankingService'

const rankings = ref<SearchRankingItem[]>([])
const loading = ref(false)
const error = ref(false)
let refreshTimer: number | undefined

const fetchRankings = async () => {
  try {
    loading.value = true
    error.value = false
    rankings.value = await searchRankingService.getRankings()
  } catch (err) {
    console.error('검색어 순위 조회 실패:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRankings()

  // "실시간"을 처음부터 WebSocket으로 만들면 채팅 학습 코드와 관심사가 섞인다.
  // 검색어 랭킹은 Redis 집계 값을 주기적으로 다시 읽는 polling부터 시작한다.
  refreshTimer = window.setInterval(fetchRankings, 30_000)
})

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.search-ranking {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.ranking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ranking-header h3 {
  margin: 0;
  font-size: 14px;
}

.refresh-button {
  padding: 4px 6px;
  border: 1px solid #1a1a1a;
  background: #ffffff;
  color: #1a1a1a;
  font-size: 11px;
  cursor: pointer;
}

.ranking-message {
  margin: 12px 0 0;
  color: #757575;
  font-size: 12px;
  line-height: 1.4;
}

.ranking-list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.ranking-item {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
}

.rank-number {
  color: #d73a31;
  font-weight: 700;
}

.rank-keyword {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-score {
  color: #757575;
}
</style>
