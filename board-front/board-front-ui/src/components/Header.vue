<template>
  <header class="header">
    <div class="logo">DolphaGo's Blog</div>
    <form class="header-search" role="search" @submit.prevent="submitSearch">
      <input
        v-model="keyword"
        class="header-search-input"
        type="search"
        placeholder="게시글 검색"
        role="combobox"
        aria-label="게시글 검색"
        aria-haspopup="listbox"
        :aria-expanded="suggestions.length > 0"
        aria-autocomplete="list"
        aria-controls="header-search-suggestions"
        :aria-activedescendant="activeSuggestionId"
        @keydown="handleSearchKeydown"
      >
      <button type="submit" class="header-search-button">검색</button>
      <p
        v-if="rankingRecordError"
        class="ranking-record-error"
        data-testid="ranking-record-error"
      >
        검색은 진행했지만 실시간 검색어 기록은 실패했습니다.
      </p>
      <ul
        v-if="suggestions.length > 0"
        id="header-search-suggestions"
        class="search-suggestions"
        role="listbox"
      >
        <li class="search-suggestion-guide" role="presentation" data-testid="search-suggestion-guide">
          실시간 검색 기록 기반 추천
        </li>
        <li v-for="(suggestion, index) in suggestions" :key="suggestion.keyword">
          <button
            type="button"
            :id="suggestionOptionId(index)"
            class="search-suggestion"
            :class="{ active: index === highlightedSuggestionIndex }"
            data-testid="search-suggestion"
            role="option"
            :aria-selected="index === highlightedSuggestionIndex"
            @click="submitSuggestion(suggestion.keyword)"
          >
            <span>{{ suggestion.keyword }}</span>
            <span>검색 {{ suggestion.score }}회</span>
          </button>
        </li>
      </ul>
    </form>
    <nav>
      <router-link to="/" data-nav="home">Home</router-link>
      <router-link to="/" data-nav="posts">Posts</router-link>
      <router-link to="/notices">공지사항</router-link>
      <router-link to="/post/edit">글쓰기</router-link>
      <!-- 로그인/세션을 붙이기 전 학습 단계에서는 role=admin query로 공지 작성 UI를 직접 열어 본다.
           실제 권한은 백엔드가 member authority로 다시 검사하므로 이 링크는 관리자 흐름 학습용 진입점이다. -->
      <router-link to="/post/edit?role=admin">공지 작성</router-link>
      <router-link to="/chat/rooms">Chat</router-link>
      <router-link to="/admin/hidden-posts">숨김 관리</router-link>
    </nav>
  </header>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { searchRankingService, type SearchRankingItem } from 'src/api/searchRankingService'
import { normalizeSearchKeyword } from 'src/search/normalizeSearchKeyword'
import { createHeaderSearch } from './useHeaderSearch'

const router = useRouter()
const suggestions = ref<SearchRankingItem[]>([])
const highlightedSuggestionIndex = ref(-1)
let suggestionRequestSequence = 0
let skipNextSuggestionLookup = false
const { keyword, rankingRecordError, submitSearch } = createHeaderSearch({
  onSearch: searchKeyword => router.push({
    path: '/search',
    query: {
      keyword: searchKeyword,
    },
  }),
})

const suggestionOptionId = (index: number) => `header-search-suggestion-${index}`

const activeSuggestionId = computed(() => {
  // combobox/listbox 패턴에서는 input focus를 유지한 채 현재 option id를 aria-activedescendant로 알려준다.
  // 이렇게 해야 ArrowDown으로 이동한 추천어를 화면리더가 "현재 선택"으로 따라 읽을 수 있다.
  return suggestions.value[highlightedSuggestionIndex.value]
    ? suggestionOptionId(highlightedSuggestionIndex.value)
    : undefined
})

watch(keyword, async currentKeyword => {
  if (skipNextSuggestionLookup) {
    skipNextSuggestionLookup = false
    clearSuggestions()
    return
  }

  const normalizedKeyword = normalizeSearchKeyword(currentKeyword)
  const requestSequence = ++suggestionRequestSequence

  if (normalizedKeyword.length === 0) {
    clearSuggestions()
    return
  }

  try {
    // 추천어는 실시간 검색어 랭킹 ZSET을 prefix로 좁힌 결과다.
    // 그래서 추천 목록에는 "검색 기록 기반" 안내를 함께 보여 사용자가 개인 사전이 아니라 랭킹 데이터임을 알 수 있게 한다.
    // 사용자가 빠르게 타이핑하면 이전 요청이 늦게 도착할 수 있으므로 requestSequence로 최신 응답만 반영한다.
    const nextSuggestions = await searchRankingService.suggestKeywords(normalizedKeyword, 5)
    if (requestSequence === suggestionRequestSequence) {
      suggestions.value = nextSuggestions
      resetSuggestionHighlight()
    }
  } catch (err) {
    console.error('검색어 추천 조회 실패:', err)
    if (requestSequence === suggestionRequestSequence) {
      clearSuggestions()
    }
  }
})

const resetSuggestionHighlight = () => {
  highlightedSuggestionIndex.value = -1
}

const clearSuggestions = () => {
  suggestions.value = []
  resetSuggestionHighlight()
}

const moveSuggestionHighlight = (amount: number) => {
  if (suggestions.value.length === 0) {
    return
  }

  // 추천 목록은 순환형으로 움직인다.
  // 사용자는 첫 항목에서 ArrowUp을 눌러 마지막 추천어로 이동할 수 있고, 반대 방향도 동일하다.
  highlightedSuggestionIndex.value = (
    highlightedSuggestionIndex.value + amount + suggestions.value.length
  ) % suggestions.value.length
}

const submitHighlightedSuggestion = async (event: KeyboardEvent) => {
  const highlightedSuggestion = suggestions.value[highlightedSuggestionIndex.value]

  if (!highlightedSuggestion) {
    return
  }

  event.preventDefault()
  await submitSuggestion(highlightedSuggestion.keyword)
}

const handleSearchKeydown = async (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveSuggestionHighlight(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveSuggestionHighlight(-1)
    return
  }

  if (event.key === 'Escape') {
    clearSuggestions()
    return
  }

  if (event.key === 'Enter') {
    await submitHighlightedSuggestion(event)
  }
}

const submitSuggestion = async (suggestionKeyword: string) => {
  // 추천어 클릭/키보드 선택은 이미 사용자가 검색어를 확정한 상태다.
  // keyword 변경이 다시 추천 조회를 발생시키면 닫은 드롭다운이 재노출되므로 다음 watcher 1회만 건너뛴다.
  skipNextSuggestionLookup = true
  keyword.value = suggestionKeyword
  clearSuggestions()
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

.ranking-record-error {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  color: #b3261e;
  font-size: 11px;
  line-height: 1.35;
}

.ranking-record-error + .search-suggestions {
  top: calc(100% + 24px);
}

.search-suggestion-guide {
  padding: 6px 8px 4px;
  border-bottom: 1px solid #eeeeee;
  color: #666666;
  font-size: 11px;
  font-weight: 700;
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

.search-suggestion:hover,
.search-suggestion.active {
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
