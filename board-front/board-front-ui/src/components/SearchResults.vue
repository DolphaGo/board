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

      <ol v-else class="result-list">
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
          <ul v-if="result.scoringSignals.length > 0" class="scoring-signal-list">
            <li v-for="signal in result.scoringSignals" :key="`${result.postId}:${signal.field}`">
              <span class="signal-category">{{ signal.category }}</span>
              <span class="signal-field">{{ signal.label }} x{{ signal.boost.toFixed(2) }}</span>
              <span class="signal-state">{{ signal.applied ? '적용' : '대기' }}</span>
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

.scoring-signal-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.scoring-signal-list li {
  display: grid;
  grid-template-columns: 120px minmax(92px, auto) 40px 1fr;
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
