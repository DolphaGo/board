<template>
  <section class="post-list" aria-labelledby="post-list-title">
    <header class="board-header">
      <h2 id="post-list-title">게시글</h2>
      <span class="board-summary">{{ boardSummary }}</span>
    </header>

    <p v-if="loading" class="board-message">게시글을 불러오는 중...</p>
    <p v-else-if="error" class="board-message">게시글 목록을 불러오지 못했습니다.</p>
    <p v-else-if="posts.length === 0" class="board-message">게시글이 없습니다.</p>

    <div v-else class="board-rows">
      <article v-for="post in posts" :key="post.id" class="board-row">
        <router-link class="board-title-link" :to="`/post/${post.id}`">
          <span v-if="post.notice" class="notice-badge">공지</span>
          <span class="board-title-text">{{ post.title }}</span>
        </router-link>
        <p class="post-preview">{{ post.content }}</p>
        <div class="meta-row">
          <span>{{ post.authorNickname }}</span>
          <span>{{ formatCreatedAt(post.createdAt) }}</span>
          <span>조회 {{ post.viewCount }}</span>
          <span>댓글 {{ post.commentCount }}</span>
          <span>추천 {{ post.recommendCount }}</span>
        </div>
      </article>
    </div>

    <nav
      v-if="posts.length > 0"
      class="board-pagination"
      data-testid="board-pagination"
      aria-label="게시글 페이지"
    >
      <button
        type="button"
        class="board-page-button board-page-edge"
        data-testid="board-page-first"
        :disabled="currentPage === 1"
        @click="goToPage(1)"
      >
        처음
      </button>
      <button
        type="button"
        class="board-page-button board-page-edge"
        data-testid="board-page-prev"
        :disabled="currentPage === 1"
        @click="movePage(-1)"
      >
        이전
      </button>
      <div class="board-page-numbers" aria-label="페이지 번호">
        <button
          v-for="pageNumber in pageNumbers"
          :key="pageNumber"
          type="button"
          class="board-page-number"
          :class="{ current: pageNumber === currentPage }"
          data-testid="board-page-number"
          :aria-current="pageNumber === currentPage ? 'page' : undefined"
          :disabled="pageNumber === currentPage"
          @click="goToPage(pageNumber)"
        >
          <span
            v-if="pageNumber === currentPage"
            data-testid="board-page-number-current"
            aria-current="page"
          >
            {{ pageNumber }}
          </span>
          <template v-else>{{ pageNumber }}</template>
        </button>
      </div>
      <button
        type="button"
        class="board-page-button board-page-edge"
        data-testid="board-page-next"
        :disabled="currentPage === totalPages"
        @click="movePage(1)"
      >
        다음
      </button>
      <button
        type="button"
        class="board-page-button board-page-edge"
        data-testid="board-page-last"
        :disabled="currentPage === totalPages"
        @click="goToPage(totalPages)"
      >
        끝
      </button>
      <span class="board-page-status">{{ currentPage }} / {{ totalPages }}</span>
    </nav>

    <div class="board-action-bar" data-testid="board-action-bar">
      <p class="board-action-copy">
        이미지와 Markdown 흐름까지 확인하는 글쓰기 화면으로 이동합니다.
      </p>
      <router-link
        to="/post/edit"
        class="board-write-link"
        data-testid="board-write-link"
      >
        글쓰기
      </router-link>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { postService, type PostListItemResponse } from 'src/api/postService'

const posts = ref<PostListItemResponse[]>([])
const loading = ref(false)
const error = ref(false)
const currentPage = ref(1)
const totalElements = ref(0)
const serverTotalPages = ref(1)
const PAGE_SIZE = 10
const MAX_VISIBLE_PAGE_NUMBERS = 5

const totalPages = computed(() => Math.max(1, serverTotalPages.value))

const pageNumbers = computed(() => {
  const visibleCount = Math.min(MAX_VISIBLE_PAGE_NUMBERS, totalPages.value)
  const halfWindow = Math.floor(visibleCount / 2)
  const maxStartPage = Math.max(1, totalPages.value - visibleCount + 1)
  const startPage = Math.min(maxStartPage, Math.max(1, currentPage.value - halfWindow))

  // 게시판 페이지가 많아질수록 모든 번호를 한 번에 보여주면 하단 컨트롤이 길어지고 모바일에서 줄이 깨진다.
  // 현재 페이지를 중심으로 최대 5개만 보여주면 사용자는 주변 이동을 빠르게 하고, 처음/끝 버튼으로 큰 이동도 할 수 있다.
  return Array.from({ length: visibleCount }, (_, index) => startPage + index)
})

const boardSummary = computed(() =>
  totalElements.value > 0
    ? `최신순 ${totalElements.value}건 · ${currentPage.value}/${totalPages.value}페이지`
    : '최신순 0건'
)

const movePage = async (amount: number) => {
  const nextPage = Math.min(totalPages.value, Math.max(1, currentPage.value + amount))

  await goToPage(nextPage)
}

const goToPage = async (nextPage: number) => {
  if (nextPage === currentPage.value) {
    return
  }

  await fetchPosts(nextPage)
}

const formatCreatedAt = (createdAt: string) => {
  // 서버는 LocalDateTime을 ISO 문자열로 내려준다.
  // 목록에서는 시간보다 날짜 스캔성이 중요하므로 yyyy.MM.dd까지만 표시한다.
  return createdAt.slice(0, 10).replaceAll('-', '.')
}

const fetchPosts = async (page = 1) => {
  try {
    loading.value = true
    error.value = false
    // 홈 목록은 게시글 작성/검색 학습 흐름의 출발점이다.
    // 서버 page는 0부터 시작하고, 화면 page는 사용자가 읽기 쉬운 1부터 시작한다.
    // 이 경계 변환을 컴포넌트에 모아두면 버튼 UI는 1/2페이지처럼 자연스럽게 보이고 API 계약은 Spring PageRequest와 맞는다.
    const response = await postService.listPosts({ page: page - 1, size: PAGE_SIZE })
    posts.value = response.items
    totalElements.value = response.totalElements
    serverTotalPages.value = response.totalPages
    currentPage.value = response.page + 1
  } catch (err) {
    console.error('게시글 목록 조회 실패:', err)
    posts.value = []
    totalElements.value = 0
    serverTotalPages.value = 1
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchPosts)
</script>

<style scoped>
.post-list {
  background-color: #fff;
  color: #000;
  padding: 20px 0;
}

.board-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px 8px;
  border-bottom: 2px solid #000;
}

.board-header h2 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 32px;
  line-height: 1.1;
}

.board-summary {
  color: #757575;
  font-size: 12px;
}

.board-message {
  margin: 14px 12px 0;
  color: #757575;
  font-size: 13px;
}

.board-row {
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
}

.board-row:hover {
  background: #fafafa;
}

.board-title-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #000;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  text-decoration: none;
}

.board-title-link:hover {
  color: #057dbc;
}

.notice-badge {
  display: inline-block;
  border: 1px solid #c40000;
  padding: 1px 4px;
  color: #c40000;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.post-preview {
  margin: 4px 0;
  color: #5f6368;
  font-size: 14px;
  line-height: 1.5;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #757575;
  font-size: 12px;
  line-height: 1.4;
}

.board-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 16px 12px 0;
}

.board-page-button {
  min-width: 54px;
  border: 1px solid #cfd7de;
  background: #ffffff;
  color: #1f2933;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  min-height: 32px;
  padding: 0 12px;
}

.board-page-edge {
  background: #f8fafc;
}

.board-page-button:disabled {
  background: #f4f6f8;
  color: #9aa4af;
  cursor: not-allowed;
}

.board-page-numbers {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 4px;
}

.board-page-number {
  inline-size: 34px;
  block-size: 34px;
  border: 1px solid #d7dee6;
  background: #ffffff;
  color: #1f2933;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  padding: 0;
  text-align: center;
}

.board-page-number:hover:not(:disabled),
.board-page-button:hover:not(:disabled) {
  border-color: #057dbc;
  color: #057dbc;
}

.board-page-number.current,
.board-page-number:disabled.current {
  border-color: #111827;
  background: #111827;
  color: #ffffff;
  cursor: default;
}

.board-page-status {
  color: #53606c;
  font-size: 12px;
  font-weight: 700;
  min-width: 54px;
  text-align: center;
}

.board-action-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin: 16px 12px 0;
  padding-top: 12px;
  border-top: 1px solid #e8edf2;
}

.board-action-copy {
  margin: 0;
  color: #64717d;
  font-size: 12px;
  line-height: 1.45;
}

.board-write-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 82px;
  min-height: 36px;
  border: 1px solid #111827;
  background: #111827;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.board-write-link:hover {
  background: #057dbc;
  border-color: #057dbc;
}

@media (max-width: 640px) {
  .board-action-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .board-write-link {
    inline-size: 100%;
  }
}
</style>
