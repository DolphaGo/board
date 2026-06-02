<template>
  <MainLayout>
    <section class="search-results">
      <div class="search-results-header">
        <h2>검색 결과</h2>
        <p v-if="searchKeyword" class="search-keyword">"{{ searchKeyword }}"</p>
      </div>

      <p v-if="loading" class="search-message">검색 중...</p>
      <p v-else-if="error" class="search-message">검색 결과를 불러오지 못했습니다.</p>
      <p v-else-if="searchKeyword.length === 0" class="search-message">검색어를 입력해 주세요.</p>
      <p v-else-if="results.length === 0" class="search-message">검색 결과가 없습니다.</p>

      <dl
        v-if="searchTokenAnalysisRows.length > 0"
        class="search-token-analysis"
        data-testid="search-token-analysis"
      >
        <template v-for="row in searchTokenAnalysisRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>: {{ row.keyword }} · {{ row.applied ? '적용' : '대기' }}</dd>
        </template>
      </dl>

      <ol v-if="!loading && !error && searchKeyword.length > 0 && results.length > 0" class="result-list">
        <li v-for="result in results" :key="result.postId" class="result-item">
          <router-link :to="`/post/${result.postId}`" class="result-title">{{ result.title }}</router-link>
          <p class="result-preview">{{ result.contentPreview }}</p>
          <div class="result-meta">
            <span>점수 {{ result.score.toFixed(2) }}</span>
            <span v-if="highlightCount(result) > 0">하이라이트 {{ highlightCount(result) }}개</span>
          </div>
          <p
            v-if="result.scoringSignals.length > 0"
            class="scoring-summary"
            data-testid="scoring-summary"
          >
            {{ scoringSummary(result) }}
          </p>
          <p
            v-if="result.scoringSignals.length > 0"
            class="scoring-category-summary"
            data-testid="scoring-category-summary"
          >
            {{ scoringCategorySummary(result) }}
          </p>
          <ul v-if="result.scoringSignals.length > 0" class="scoring-signal-list">
            <li v-for="signal in result.scoringSignals" :key="`${result.postId}:${signal.field}`">
              <span class="signal-category">{{ signal.category }}</span>
              <span class="signal-field">{{ signal.label }} x{{ signal.boost.toFixed(2) }}</span>
              <span class="signal-state">{{ signal.applied ? '적용' : '대기' }}</span>
              <span class="signal-keyword" data-testid="scoring-signal-keyword">
                검색 토큰: {{ signal.keyword }}
              </span>
              <span class="signal-description">{{ signal.description }}</span>
            </li>
          </ul>
          <ul v-if="highlightCount(result) > 0" class="highlight-list">
            <li v-for="snippet in highlightSnippets(result)" :key="`${snippet.field}:${snippet.text}`">
              <span class="highlight-field">{{ snippet.field }}</span>
              <!-- ES highlight는 원문 기반 문자열이므로 v-html로 넣지 않는다.
                   학습용 샘플에서는 XSS 위험을 피하려고 태그까지 텍스트로 보여준다. -->
              <span class="highlight-text">{{ snippet.text }}</span>
            </li>
          </ul>
        </li>
      </ol>
    </section>
  </MainLayout>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from './MainLayout.vue'
import { postSearchService, type PostSearchResult } from 'src/api/postSearchService'
import { normalizeSearchKeyword } from 'src/search/normalizeSearchKeyword'
import { collectSearchResultHighlights } from './searchResultHighlights'

const route = useRoute()
const results = ref<PostSearchResult[]>([])
const loading = ref(false)
const error = ref(false)
let searchRequestId = 0

const searchKeyword = computed(() => {
  const keyword = route.query.keyword

  return typeof keyword === 'string' ? normalizeSearchKeyword(keyword) : ''
})

const highlightCount = (result: PostSearchResult): number =>
  Object.values(result.highlights).reduce((count, values) => count + values.length, 0)

const highlightSnippets = (result: PostSearchResult) => collectSearchResultHighlights(result.highlights)

const scoringSummary = (result: PostSearchResult): string => {
  const appliedSignals = result.scoringSignals.filter(signal => signal.applied)
  const appliedSignalLabels = appliedSignals.map(signal => signal.label)

  // 개별 signal 목록은 자세한 query plan이고, 이 요약은 사용자가 검색 결과를 훑을 때 보는 첫 설명이다.
  // BM25 원문 match, 음절/초성 보조 필드, 공지 function_score 중 실제 적용된 신호만 압축해서 보여준다.
  return `적용 신호 ${appliedSignals.length}/${result.scoringSignals.length}개: ${
    appliedSignalLabels.length > 0 ? appliedSignalLabels.join(', ') : '없음'
  }`
}

const scoringCategorySummary = (result: PostSearchResult): string => {
  const appliedCategoryCounts = result.scoringSignals
    .filter(signal => signal.applied)
    .reduce<Record<string, number>>((counts, signal) => {
      counts[signal.category] = (counts[signal.category] ?? 0) + 1

      return counts
    }, {})
  const summary = Object.entries(appliedCategoryCounts)
    .map(([category, count]) => `${category} ${count}개`)
    .join(' · ')

  // category는 BM25 원문 점수, 음절/초성 recall, function_score 같은 큰 학습 단위다.
  // 같은 적용 신호라도 어느 계열의 검색 전략이 먹혔는지 묶어 보면 점수 튜닝 방향을 잡기 쉽다.
  return `카테고리: ${summary.length > 0 ? summary : '없음'}`
}

const findSignalByCategory = (category: string) =>
  results.value
    .flatMap(result => result.scoringSignals)
    .find(signal => signal.category === category)

const searchTokenAnalysisRows = computed(() => {
  const rows = [
    { label: '원문/BM25', signal: findSignalByCategory('BM25_TEXT') },
    { label: '음절 토큰', signal: findSignalByCategory('SYLLABLE_RECALL') },
    { label: '초성 토큰', signal: findSignalByCategory('INITIAL_RECALL') },
  ].flatMap(row =>
    row.signal?.keyword
      ? [{
          label: row.label,
          keyword: row.signal.keyword,
          applied: row.signal.applied,
        }]
      : []
  )

  // 이 요약은 ES가 실제로 받은 "원문 query + 음절 보조 query + 초성 보조 query"를 한눈에 보여주는 학습용 패널이다.
  // 결과별 signal 목록은 자세한 query plan이고, 여기서는 검색어가 어떤 recall 계열로 확장되고 실제 기여했는지만 압축한다.
  return rows
})

// scoringSignals는 Elasticsearch explain API의 원문이 아니라, 우리가 구성한 query plan을 학습용으로 풀어낸 값이다.
// 실제 점수는 BM25, field length, term frequency, function_score가 합쳐져 계산되므로 화면에는 "어떤 신호가 쓰였는지"만 보여준다.

watch(
  searchKeyword,
  async keyword => {
    if (keyword.length === 0) {
      searchRequestId += 1
      results.value = []
      error.value = false
      loading.value = false
      return
    }

    // 검색어를 빠르게 바꿀 때 먼저 보낸 요청이 늦게 끝나면 최신 화면을 덮어쓸 수 있다.
    // 요청마다 번호를 붙이고 현재 번호와 같은 응답만 반영해서 오래된 응답을 무시한다.
    const requestId = searchRequestId + 1
    searchRequestId = requestId

    try {
      loading.value = true
      error.value = false
      const searchedResults = await postSearchService.search(keyword)
      if (requestId !== searchRequestId) {
        return
      }

      results.value = searchedResults
    } catch (err) {
      if (requestId !== searchRequestId) {
        return
      }

      console.error('게시글 검색 실패:', err)
      results.value = []
      error.value = true
    } finally {
      if (requestId === searchRequestId) {
        loading.value = false
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.search-results {
  width: 100%;
}

.search-results-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  border-bottom: 2px solid #1a1a1a;
  padding-bottom: 10px;
}

.search-results-header h2 {
  margin: 0;
  font-size: 22px;
}

.search-keyword {
  margin: 0;
  color: #555555;
  font-size: 13px;
}

.search-message {
  margin: 18px 0 0;
  color: #757575;
  font-size: 13px;
}

.search-token-analysis {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 8px;
  margin: 12px 0 4px;
  padding: 10px 12px;
  border: 1px solid #d8e6ef;
  background: #f8fbfd;
  color: #333333;
  font-size: 12px;
}

.search-token-analysis dt {
  color: #057dbc;
  font-weight: 700;
}

.search-token-analysis dd {
  margin: 0;
}

.result-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.result-item {
  padding: 14px 0;
  border-bottom: 1px solid #e0e0e0;
}

.result-title {
  color: #1a1a1a;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
}

.result-preview {
  margin: 7px 0;
  color: #333333;
  font-size: 13px;
  line-height: 1.5;
}

.result-meta {
  display: flex;
  gap: 10px;
  color: #757575;
  font-size: 12px;
}

.scoring-summary {
  margin: 8px 0 0;
  color: #333333;
  font-size: 12px;
  font-weight: 700;
}

.scoring-category-summary {
  margin: 4px 0 0;
  color: #555555;
  font-size: 12px;
}

.scoring-signal-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.scoring-signal-list li {
  display: grid;
  grid-template-columns: 120px minmax(92px, auto) 40px minmax(140px, auto) 1fr;
  gap: 8px;
  margin-top: 4px;
  color: #444444;
  font-size: 12px;
}

.signal-category {
  color: #057dbc;
  font-weight: 700;
}

.signal-field {
  color: #333333;
  font-weight: 700;
}

.signal-state {
  color: #777777;
}

.signal-keyword {
  color: #555555;
  word-break: keep-all;
}

.signal-description {
  min-width: 0;
  word-break: keep-all;
}

.highlight-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.highlight-list li {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  color: #333333;
  font-size: 12px;
}

.highlight-field {
  min-width: 52px;
  color: #777777;
  font-weight: 700;
}

.highlight-text {
  word-break: break-word;
}
</style>
