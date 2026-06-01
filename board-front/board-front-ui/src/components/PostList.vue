<template>
  <section class="post-list" aria-labelledby="post-list-title">
    <header class="board-header">
      <h2 id="post-list-title">게시글</h2>
      <span class="board-summary">최신순 {{ posts.length }}건</span>
    </header>

    <p v-if="loading" class="board-message">게시글을 불러오는 중...</p>
    <p v-else-if="error" class="board-message">게시글 목록을 불러오지 못했습니다.</p>
    <p v-else-if="posts.length === 0" class="board-message">게시글이 없습니다.</p>

    <div v-else class="board-rows">
      <article v-for="post in posts" :key="post.id" class="board-row">
        <router-link class="board-title-link" :to="`/post/${post.id}`">
          {{ post.title }}
        </router-link>
        <p class="post-preview">{{ post.content }}</p>
        <div class="meta-row">
          <span>조회 {{ post.viewCount }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { postService, type PostResponse } from 'src/api/postService'

const posts = ref<PostResponse[]>([])
const loading = ref(false)
const error = ref(false)

const fetchPosts = async () => {
  try {
    loading.value = true
    error.value = false
    // 홈 목록은 게시글 작성/검색 학습 흐름의 출발점이다.
    // 지금은 단순 조회만 연결하고, 정렬/페이지네이션은 백엔드 계약이 생긴 뒤 붙인다.
    posts.value = await postService.listPosts()
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
  color: #000;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  text-decoration: none;
}

.board-title-link:hover {
  color: #057dbc;
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
