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
import { collectSearchResultHighlights } from './searchResultHighlights'

const route = useRoute()
const results = ref<PostSearchResult[]>([])
const loading = ref(false)
const error = ref(false)
let searchRequestId = 0

const searchKeyword = computed(() => {
  const keyword = route.query.keyword

  return typeof keyword === 'string' ? keyword : ''
})

const highlightCount = (result: PostSearchResult): number =>
  Object.values(result.highlights).reduce((count, values) => count + values.length, 0)

const highlightSnippets = (result: PostSearchResult) => collectSearchResultHighlights(result.highlights)

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
