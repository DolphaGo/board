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
      <article v-for="post in pagedPosts" :key="post.id" class="board-row">
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
        class="board-page-button"
        data-testid="board-page-prev"
        :disabled="currentPage === 1"
        @click="movePage(-1)"
      >
        이전
      </button>
      <span class="board-page-status">{{ currentPage }} / {{ totalPages }}</span>
      <button
        type="button"
        class="board-page-button"
        data-testid="board-page-next"
        :disabled="currentPage === totalPages"
        @click="movePage(1)"
      >
        다음
      </button>
    </nav>
  </section>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { postService, type PostListItemResponse } from 'src/api/postService'

const posts = ref<PostListItemResponse[]>([])
const loading = ref(false)
const error = ref(false)
const currentPage = ref(1)
const PAGE_SIZE = 10

const totalPages = computed(() => Math.max(1, Math.ceil(posts.value.length / PAGE_SIZE)))

const pagedPosts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE

  return posts.value.slice(start, start + PAGE_SIZE)
})

const boardSummary = computed(() =>
  posts.value.length > 0
    ? `최신순 ${posts.value.length}건 · ${currentPage.value}/${totalPages.value}페이지`
    : '최신순 0건'
)

const movePage = (amount: number) => {
  currentPage.value = Math.min(totalPages.value, Math.max(1, currentPage.value + amount))
}

const formatCreatedAt = (createdAt: string) => {
  // 서버는 LocalDateTime을 ISO 문자열로 내려준다.
  // 목록에서는 시간보다 날짜 스캔성이 중요하므로 yyyy.MM.dd까지만 표시한다.
  return createdAt.slice(0, 10).replaceAll('-', '.')
}

const fetchPosts = async () => {
  try {
    loading.value = true
    error.value = false
    // 홈 목록은 게시글 작성/검색 학습 흐름의 출발점이다.
    // 백엔드 페이지 계약이 붙기 전까지는 전체 목록을 받아 프론트에서 10개씩 잘라 보여준다.
    // 이렇게 해두면 사용자는 실제 게시판처럼 하단 페이지 이동을 먼저 체험하고, 이후 서버 페이지네이션으로 자연스럽게 교체할 수 있다.
    posts.value = await postService.listPosts()
    currentPage.value = 1
  } catch (err) {
    console.error('게시글 목록 조회 실패:', err)
    posts.value = []
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
  gap: 8px;
  padding: 14px 12px 0;
}

.board-page-button {
  min-width: 58px;
  border: 1px solid #cfd7de;
  background: #ffffff;
  color: #1f2933;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  min-height: 32px;
  padding: 0 12px;
}

.board-page-button:disabled {
  background: #f4f6f8;
  color: #9aa4af;
  cursor: not-allowed;
}

.board-page-status {
  color: #333333;
  font-size: 13px;
  font-weight: 700;
  min-width: 54px;
  text-align: center;
}
</style>
