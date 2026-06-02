<template>
  <header class="header">
    <div class="logo">DolphaGo's Blog</div>
    <form class="header-search" role="search" @submit.prevent="submitSearch">
      <input
        v-model="keyword"
        class="header-search-input"
        type="search"
        placeholder="게시글 검색"
        aria-label="게시글 검색"
      >
      <button type="submit" class="header-search-button">검색</button>
      <ul v-if="suggestions.length > 0" class="search-suggestions">
        <li v-for="suggestion in suggestions" :key="suggestion.keyword">
          <button
            type="button"
            class="search-suggestion"
            data-testid="search-suggestion"
            @click="submitSuggestion(suggestion.keyword)"
          >
            <span>{{ suggestion.keyword }}</span>
            <span>{{ suggestion.score }}회</span>
          </button>
        </li>
      </ul>
    </form>
    <nav>
      <router-link to="/" data-nav="home">Home</router-link>
      <router-link to="/" data-nav="posts">Posts</router-link>
      <router-link to="/notices">공지사항</router-link>
      <router-link to="/post/edit">글쓰기</router-link>
      <router-link to="/chat/rooms">Chat</router-link>
      <router-link to="/admin/hidden-posts">숨김 관리</router-link>
    </nav>
  </header>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { searchRankingService, type SearchRankingItem } from 'src/api/searchRankingService'
import { normalizeSearchKeyword } from 'src/search/normalizeSearchKeyword'
import { createHeaderSearch } from './useHeaderSearch'

const router = useRouter()
const suggestions = ref<SearchRankingItem[]>([])
let suggestionRequestSequence = 0
const { keyword, submitSearch } = createHeaderSearch({
  onSearch: searchKeyword => router.push({
    path: '/search',
    query: {
      keyword: searchKeyword,
    },
  }),
})

watch(keyword, async currentKeyword => {
  const normalizedKeyword = normalizeSearchKeyword(currentKeyword)
  const requestSequence = ++suggestionRequestSequence

  if (normalizedKeyword.length === 0) {
    suggestions.value = []
    return
  }

  try {
    // 추천어는 실시간 검색어 랭킹 ZSET을 prefix로 좁힌 결과다.
    // 사용자가 빠르게 타이핑하면 이전 요청이 늦게 도착할 수 있으므로 requestSequence로 최신 응답만 반영한다.
    const nextSuggestions = await searchRankingService.suggestKeywords(normalizedKeyword, 5)
    if (requestSequence === suggestionRequestSequence) {
      suggestions.value = nextSuggestions
    }
  } catch (err) {
    console.error('검색어 추천 조회 실패:', err)
    if (requestSequence === suggestionRequestSequence) {
      suggestions.value = []
    }
  }
})

const submitSuggestion = async (suggestionKeyword: string) => {
  keyword.value = suggestionKeyword
  suggestions.value = []
  await submitSearch()
}
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  width: 100%;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
}

.header-search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  width: min(360px, 36vw);
}

.header-search-input {
  min-width: 0;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #bdbdbd;
  font-size: 13px;
}

.header-search-button {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid #1a1a1a;
  background: #ffffff;
  color: #1a1a1a;
  font-size: 13px;
  cursor: pointer;
}

.search-suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1001;
  margin: 0;
  padding: 4px 0;
  border: 1px solid #bdbdbd;
  background: #fff;
  list-style: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.search-suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  background: transparent;
  color: #1a1a1a;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.search-suggestion:hover {
  background: #f5f5f5;
}

.logo {
  font-weight: bold;
  font-size: 24px;
}

nav a {
  margin-left: 15px;
  text-decoration: none;
  color: #333;
}

@media (max-width: 720px) {
  .header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-search {
    order: 3;
    width: 100%;
  }
}
</style>
