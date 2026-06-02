<template>
  <section class="search-ranking" aria-labelledby="search-ranking-title">
    <div class="ranking-header">
      <h3 id="search-ranking-title">실시간 검색어</h3>
      <button type="button" class="refresh-button" :disabled="loading" @click="fetchRankings">
        {{ loading ? '불러오는 중' : '새로고침' }}
      </button>
    </div>
    <p class="ranking-study-note" data-testid="ranking-study-note">
      검색창에서 검색한 키워드를 서버가 랭킹 점수로 기록하고, 화면은 {{ refreshIntervalSeconds }}초마다
      다시 읽거나 새 검색 성공 이벤트 때 즉시 갱신합니다.
    </p>
    <ol class="ranking-flow-list" data-testid="ranking-flow-list">
      <li v-for="step in rankingFlowSteps" :key="step.label" data-testid="ranking-flow-step">
        <strong>{{ step.order }}. {{ step.label }}</strong>: {{ step.description }}
      </li>
    </ol>
    <p
      v-if="liveRefreshFeedback"
      class="ranking-live-refresh-feedback"
      data-testid="ranking-live-refresh-feedback"
    >
      {{ liveRefreshFeedback }}
    </p>

    <p v-if="loading" class="ranking-message">불러오는 중...</p>
    <p v-else-if="error" class="ranking-message">검색어 순위를 불러오지 못했습니다.</p>
    <p v-else-if="rankings.length === 0" class="ranking-message">아직 검색 기록이 없습니다.</p>

    <ol v-else class="ranking-list">
      <li v-for="(item, index) in rankings" :key="item.keyword" class="ranking-item">
        <span class="rank-number">{{ index + 1 }}</span>
        <span class="rank-keyword">{{ item.keyword }}</span>
        <span class="rank-score">검색 {{ item.score }}회</span>
      </li>
    </ol>
    <p v-if="lastUpdatedLabel" class="ranking-updated-at">마지막 갱신 {{ lastUpdatedLabel }}</p>
  </section>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { createSearchRanking } from './useSearchRanking'
import { onSearchRankingChanged } from './searchRankingRefreshEvent'

const { rankings, loading, error, lastUpdatedAt, fetchRankings } = createSearchRanking()
const liveRefreshFeedback = ref('')
let refreshTimer: number | undefined
let unsubscribeSearchRankingChanged: (() => void) | undefined
const rankingRefreshIntervalMs = 30_000
const refreshIntervalSeconds = rankingRefreshIntervalMs / 1_000
const rankingFlowSteps = [
  {
    order: 1,
    label: '기록',
    // 검색 결과 조회 API와 헤더 검색 폼은 모두 검색어를 정규화한 뒤 Redis ZSET 점수를 올린다.
    // ZSET의 score가 "검색된 횟수"가 되므로 별도 카운트 테이블 없이도 순위를 만들 수 있다.
    description: '검색 성공 시 정규화된 검색어를 Redis ZSET 점수 +1로 저장',
  },
  {
    order: 2,
    label: '집계',
    // 서버는 reverseRangeWithScores로 점수가 높은 keyword부터 읽는다.
    // 프론트는 Redis 자료구조를 알 필요 없이 /api/search/rankings 응답의 keyword/score만 렌더링한다.
    description: '/api/search/rankings가 ZSET을 높은 점수순으로 읽어 상위 키워드 반환',
  },
  {
    order: 3,
    label: '갱신',
    // polling은 서버 push 없이도 동작하는 기본 실시간성이고,
    // 검색 성공 이벤트는 사용자가 방금 검색한 키워드를 30초 기다리지 않고 반영하기 위한 즉시 갱신 경로다.
    description: `${refreshIntervalSeconds}초 polling 또는 검색 성공 이벤트가 사이드바 순위를 다시 조회`,
  },
]

const lastUpdatedLabel = computed(() => {
  if (lastUpdatedAt.value === null) {
    return ''
  }

  return lastUpdatedAt.value.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

const fetchRankingsAfterSearchEvent = () => {
  // polling은 조용히 동작하지만, 검색 성공 이벤트로 다시 읽은 경우는 사용자가 즉시 갱신을 체감해야 한다.
  // 그래서 "방금 검색어가 기록됨" 피드백을 별도 상태로 두어 실시간 랭킹 학습 포인트를 화면에 남긴다.
  liveRefreshFeedback.value = '방금 검색어가 기록되어 순위를 다시 읽었습니다.'
  fetchRankings()
}

onMounted(() => {
  fetchRankings()

  // "실시간"을 처음부터 WebSocket으로 만들면 채팅 학습 코드와 관심사가 섞인다.
  // 검색어 랭킹은 Redis 집계 값을 주기적으로 다시 읽는 polling부터 시작한다.
  refreshTimer = window.setInterval(fetchRankings, rankingRefreshIntervalMs)
  // 검색창에서 새 검색어 기록이 성공하면 polling 주기를 기다리지 않고 즉시 다시 읽는다.
  unsubscribeSearchRankingChanged = onSearchRankingChanged(fetchRankingsAfterSearchEvent)
})

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer)
  }

  unsubscribeSearchRankingChanged?.()
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
  min-width: 64px;
  padding: 4px 6px;
  border: 1px solid #1a1a1a;
  background: #ffffff;
  color: #1a1a1a;
  font-size: 11px;
  cursor: pointer;
}

.refresh-button:disabled {
  color: #757575;
  border-color: #bdbdbd;
  cursor: wait;
}

.ranking-message {
  margin: 12px 0 0;
  color: #757575;
  font-size: 12px;
  line-height: 1.4;
}

.ranking-study-note {
  margin: 8px 0 0;
  color: #555555;
  font-size: 11px;
  line-height: 1.45;
}

.ranking-flow-list {
  margin: 8px 0 0;
  padding-left: 16px;
  color: #333333;
  font-size: 11px;
  line-height: 1.5;
}

.ranking-flow-list li + li {
  margin-top: 3px;
}

.ranking-live-refresh-feedback {
  margin: 8px 0 0;
  border: 1px solid #d8e6ef;
  background: #f8fbfd;
  padding: 7px 8px;
  color: #057dbc;
  font-size: 11px;
  line-height: 1.45;
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

.ranking-updated-at {
  margin: 8px 0 0;
  color: #757575;
  font-size: 11px;
  text-align: right;
}
</style>
