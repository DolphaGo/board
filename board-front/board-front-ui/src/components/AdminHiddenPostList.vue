<template>
  <section class="hidden-post-list" aria-labelledby="hidden-post-list-title">
    <header class="board-header">
      <h2 id="hidden-post-list-title">숨김 게시글</h2>
      <span class="board-summary">복구 대기 {{ posts.length }}건</span>
    </header>

    <p v-if="loading" class="board-message">숨김 게시글을 불러오는 중...</p>
    <p v-else-if="error" class="board-message">숨김 게시글 목록을 불러오지 못했습니다.</p>
    <p v-else-if="posts.length === 0" class="board-message">숨김 게시글이 없습니다.</p>

    <div v-else class="board-rows">
      <article v-for="post in posts" :key="post.id" class="board-row">
        <router-link class="board-title-link" :to="`/post/${post.id}?role=admin`">
          <span class="hidden-badge">숨김</span>
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
  </section>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { postService, type PostListItemResponse } from 'src/api/postService'

const posts = ref<PostListItemResponse[]>([])
const loading = ref(false)
const error = ref(false)

const formatCreatedAt = (createdAt: string) => {
  // 백엔드 LocalDateTime 문자열을 목록에서 빠르게 훑을 수 있는 날짜로 줄인다.
  // 상세한 시간 표시는 게시글 상세 화면에서 담당하게 두어 목록 밀도를 유지한다.
  return createdAt.slice(0, 10).replaceAll('-', '.')
}

const fetchHiddenPosts = async () => {
  try {
    loading.value = true
    error.value = false
    // 숨김 목록은 운영자가 복구할 대상을 찾는 작업 화면이다.
    // 행 링크에 role=admin을 붙여 상세 화면의 복구 버튼까지 같은 흐름으로 이어지게 한다.
    posts.value = await postService.listHiddenPosts()
  } catch (err) {
    console.error('숨김 게시글 목록 조회 실패:', err)
    posts.value = []
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchHiddenPosts)
</script>

<style scoped>
.hidden-post-list {
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

.hidden-badge {
  display: inline-block;
  border: 1px solid #7c1d1d;
  padding: 1px 4px;
  color: #7c1d1d;
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
</style>
