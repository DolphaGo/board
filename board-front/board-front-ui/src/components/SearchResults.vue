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
      <div v-else-if="results.length === 0" class="search-empty-state">
        <p class="search-message">검색 결과가 없습니다.</p>
        <p class="search-empty-study-note" data-testid="search-empty-study-note">
          검색어는 실시간 랭킹에 기록되지만, 관리자 숨김 또는 삭제 처리된 게시글은 display=true 필터 때문에 결과에서 제외됩니다.
        </p>
        <p class="search-empty-study-note" data-testid="search-empty-strategy-note">
          원문 단어가 안 잡히면 핵심 단어를 줄이거나, 코프링처럼 음절 일부 또는 ㅋㅍㄹ 같은 초성으로 다시 검색해 보세요.
        </p>
      </div>

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

      <section
        v-if="showScoringStudyGuide"
        class="search-scoring-study-guide"
        data-testid="search-scoring-study-guide"
        aria-label="검색 점수 학습 요약"
      >
        <p
          v-for="guide in scoringStudyGuideRows"
          :key="guide.category"
          data-testid="search-scoring-study-guide-row"
        >
          <strong>{{ guide.label }}</strong>: {{ guide.description }}
          <span class="search-scoring-study-guide-state">· {{ guide.statusLabel }}</span>
        </p>
      </section>

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
          <ul
            v-if="scoreFamilyComparisonRows(result).length > 0"
            class="score-family-comparison"
            data-testid="score-family-comparison"
          >
            <li
              v-for="row in scoreFamilyComparisonRows(result)"
              :key="`${result.postId}:${row.category}`"
              data-testid="score-family-comparison-row"
            >
              {{ scoreFamilyComparisonText(row) }}
            </li>
          </ul>
          <div
            v-if="result.scoreExplanation"
            class="score-explanation"
          >
            <p data-testid="score-explanation">
              {{ scoreExplanationSummary(result) }}
            </p>
            <p data-testid="score-explanation-description">
              {{ result.scoreExplanation.description }}
            </p>
          </div>
          <ul v-if="result.scoringSignals.length > 0" class="scoring-signal-list">
            <li
              v-for="signal in result.scoringSignals"
              :key="`${result.postId}:${signal.field}`"
              class="scoring-signal-item"
              data-testid="scoring-signal-item"
            >
              <span class="signal-category">{{ signal.category }}</span>
              <span class="signal-field">{{ signal.label }} x{{ signal.boost.toFixed(2) }}</span>
              <span class="signal-state">{{ signal.applied ? '적용' : '대기' }}</span>
              <span class="signal-keyword" data-testid="scoring-signal-keyword">
                검색 토큰: {{ signal.keyword }}
              </span>
              <span class="signal-description">
                <span class="signal-study-label" data-testid="scoring-signal-study-label">
                  {{ scoringSignalStudyLabel(signal) }}
                </span>: {{ signal.description }}
              </span>
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
import {
  postSearchService,
  type PostSearchResult,
  type PostSearchScoreSignal,
} from 'src/api/postSearchService'
import { normalizeSearchKeyword } from 'src/search/normalizeSearchKeyword'
import { collectSearchResultHighlights } from './searchResultHighlights'
import { notifySearchRankingChanged } from './searchRankingRefreshEvent'

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

const scoringSignalStudyLabel = (signal: PostSearchScoreSignal): string =>
  // 적용된 signal은 이 문서가 왜 위로 올라왔는지 설명하는 "근거"이고,
  // 대기 signal은 query plan에는 들어갔지만 이 문서에서는 직접 hit가 잡히지 않은 보조 전략이다.
  signal.applied ? '적용 근거' : '대기 이유'

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

interface ScoreFamilyComparisonRow {
  category: string
  appliedCount: number
  totalCount: number
  appliedBoost: number
}

const scoreFamilyComparisonRows = (result: PostSearchResult): ScoreFamilyComparisonRow[] => {
  const rowsByCategory = result.scoringSignals.reduce<Record<string, ScoreFamilyComparisonRow>>(
    (rows, signal) => {
      const row = rows[signal.category] ?? {
        category: signal.category,
        appliedCount: 0,
        totalCount: 0,
        appliedBoost: 0,
      }

      row.totalCount += 1
      if (signal.applied) {
        row.appliedCount += 1
        row.appliedBoost += signal.boost
      }

      rows[signal.category] = row

      return rows
    },
    {}
  )

  // boost는 "이 signal이 걸렸을 때 어느 정도 가중치를 주는지"를 설명하는 학습용 숫자다.
  // 실제 ES 최종 점수는 BM25 세부 계산까지 포함하지만, 계열별 적용 boost 합계를 보면 튜닝 방향을 빠르게 비교할 수 있다.
  return Object.values(rowsByCategory)
}

const scoreFamilyComparisonText = (row: ScoreFamilyComparisonRow): string =>
  `${row.category} 적용 ${row.appliedCount}/${row.totalCount}개 · 적용 boost ${row.appliedBoost.toFixed(2)}`

const scoreExplanationSummary = (result: PostSearchResult): string => {
  const explanation = result.scoreExplanation
  if (!explanation) {
    return ''
  }

  // scoreExplanation은 ES explain API 원문이 아니라 이 샘플의 검색 query plan을 공부하기 쉽게 요약한 값이다.
  // 최종 점수, 적용된 signal 수, function_score 가산점 여부를 한 줄에 묶어 결과별 점수 해석의 출발점으로 삼는다.
  return `점수 공식 ${explanation.formula} · 최종 ${explanation.finalScore.toFixed(2)} · 적용 ${
    explanation.appliedSignalCount
  }/${explanation.totalSignalCount}개 · ${
    explanation.functionScoreApplied ? '공지 가산점 적용' : '공지 가산점 없음'
  }`
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

const showScoringStudyGuide = computed(() =>
  !loading.value && !error.value && searchKeyword.value.length > 0 && results.value.length > 0
)

interface ScoringStudyGuideDefinition {
  category: string
  label: string
  description: string
}

interface ScoringStudyGuideRow extends ScoringStudyGuideDefinition {
  presentInResponse: boolean
  statusLabel: string
}

const scoringStudyGuideDefinitions: ScoringStudyGuideDefinition[] = [
  {
    category: 'BM25_TEXT',
    label: '원문/BM25',
    description: 'BM25는 제목/본문 원문 일치의 기본 관련도입니다.',
  },
  {
    category: 'SYLLABLE_RECALL',
    label: '음절 recall',
    description: '음절 recall은 ㅋㅗ처럼 자모로 쪼갠 입력을 보조합니다.',
  },
  {
    category: 'INITIAL_RECALL',
    label: '초성 recall',
    description: '초성 recall은 ㅋㅍㄹ처럼 빠르게 입력한 초성 검색을 보조합니다.',
  },
  {
    category: 'FUNCTION_SCORE',
    label: 'function_score',
    description: 'function_score는 공지 같은 운영 신호를 작은 가산점으로 더합니다.',
  },
]

const scoringStudyGuideRows = computed<ScoringStudyGuideRow[]>(() => {
  const categoriesInResponse = new Set(
    results.value.flatMap(result => result.scoringSignals.map(signal => signal.category))
  )

  return scoringStudyGuideDefinitions
    .map((guide, index) => {
      const presentInResponse = categoriesInResponse.has(guide.category)

      return {
        ...guide,
        index,
        presentInResponse,
        // 같은 학습 설명이라도 현재 응답에 실제 query plan으로 내려온 category인지 구분해야 한다.
        // "응답 포함"은 이번 검색에서 서버가 반환한 scoringSignals에 있었던 계열이고,
        // "보조 전략"은 게시판 검색에서 자주 쓰지만 이번 응답에는 직접 등장하지 않은 참고 계열이다.
        statusLabel: presentInResponse ? '응답 포함' : '보조 전략',
      }
    })
    .sort((left, right) => {
      if (left.presentInResponse !== right.presentInResponse) {
        return left.presentInResponse ? -1 : 1
      }

      return left.index - right.index
    })
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
      // /api/search/posts는 검색 결과 조회와 동시에 서버에서 검색어 랭킹을 기록한다.
      // 성공 응답 뒤 이벤트를 발행하면 사이드바 랭킹이 30초 polling을 기다리지 않고 즉시 다시 읽는다.
      notifySearchRankingChanged()
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

.search-empty-study-note {
  margin: 8px 0 0;
  border: 1px solid #d8e6ef;
  background: #f8fbfd;
  padding: 9px 10px;
  color: #333333;
  font-size: 12px;
  line-height: 1.5;
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

.search-scoring-study-guide-state {
  color: #057dbc;
  font-weight: 700;
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

.score-family-comparison {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 4px 8px;
  margin: 8px 0 0;
  padding: 0;
  color: #333333;
  font-size: 12px;
  list-style: none;
}

.score-family-comparison li {
  padding: 5px 7px;
  border: 1px solid #e1e1e1;
  background: #fafafa;
}

.score-explanation {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid #d8e6ef;
  background: #f8fbfd;
  color: #333333;
  font-size: 12px;
}

.score-explanation p {
  margin: 0;
}

.score-explanation p + p {
  margin-top: 4px;
  color: #555555;
}

.scoring-signal-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.scoring-signal-item {
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

@media (max-width: 760px) {
  .search-token-analysis {
    grid-template-columns: 1fr;
  }

  .search-token-analysis dd {
    overflow-wrap: anywhere;
  }

  .scoring-signal-item {
    grid-template-columns: 1fr;
    gap: 3px;
    padding: 8px 0;
  }

  .signal-keyword,
  .signal-description {
    overflow-wrap: anywhere;
    word-break: normal;
  }
}
</style>
