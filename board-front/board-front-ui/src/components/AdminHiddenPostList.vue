<template>
  <section class="hidden-post-list" aria-labelledby="hidden-post-list-title">
    <header class="board-header">
      <h2 id="hidden-post-list-title">숨김 게시글</h2>
      <span class="board-summary">복구 대기 {{ posts.length }}건</span>
    </header>

    <p v-if="actionMessage" class="action-message">{{ actionMessage }}</p>
    <p v-if="actionError" class="action-error">{{ actionError }}</p>
    <p v-if="loading" class="board-message">숨김 게시글을 불러오는 중...</p>
    <p v-else-if="error" class="board-message">숨김 게시글 목록을 불러오지 못했습니다.</p>
    <p v-else-if="posts.length === 0" class="board-message">숨김 게시글이 없습니다.</p>

    <div v-else class="board-rows">
      <article v-for="post in posts" :key="post.id" class="board-row">
        <div class="title-row">
          <router-link class="board-title-link" :to="`/post/${post.id}?role=admin`">
            <span class="hidden-badge">숨김</span>
            <span class="board-title-text">{{ post.title }}</span>
          </router-link>
          <button
            type="button"
            class="restore-row-button"
            data-testid="restore-hidden-post"
            :disabled="restoringPostId === post.id"
            @click="restoreHiddenPost(post.id)"
          >
            {{ restoringPostId === post.id ? '복구 중' : '복구' }}
          </button>
        </div>
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
const actionMessage = ref('')
const actionError = ref('')
const restoringPostId = ref<number | null>(null)

const formatCreatedAt = (createdAt: string) => {
  // 백엔드 LocalDateTime 문자열을 목록에서 빠르게 훑을 수 있는 날짜로 줄인다.
  // 상세한 시간 표시는 게시글 상세 화면에서 담당하게 두어 목록 밀도를 유지한다.
  return createdAt.slice(0, 10).replaceAll('-', '.')
}

const fetchHiddenPosts = async () => {
  try {
    loading.value = true
    error.value = false
    actionMessage.value = ''
    actionError.value = ''
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

const restoreHiddenPost = async (postId: number) => {
  try {
    restoringPostId.value = postId
    actionMessage.value = ''
    actionError.value = ''
    await postService.restorePost(postId)
    // 복구된 글은 더 이상 "숨김 복구 대기" 대상이 아니다.
    // 다시 목록 API를 호출하지 않고 현재 행만 제거하면 운영 작업의 결과가 즉시 보인다.
    posts.value = posts.value.filter(post => post.id !== postId)
    actionMessage.value = '게시글을 복구했습니다.'
  } catch (err) {
    console.error('숨김 게시글 복구 실패:', err)
    actionError.value = '게시글 복구에 실패했습니다.'
  } finally {
    restoringPostId.value = null
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

.action-message,
.action-error {
  margin: 10px 12px 0;
  border: 1px solid;
  padding: 7px 8px;
  font-size: 12px;
  line-height: 1.4;
}

.action-message {
  border-color: #b7d7a8;
  background: #f4fbf1;
  color: #2f6b1f;
}

.action-error {
  border-color: #e5b5b5;
  background: #fff5f5;
  color: #8a1f1f;
}

.board-row {
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
}

.board-row:hover {
  background: #fafafa;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
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

.restore-row-button {
  flex: 0 0 auto;
  border: 1px solid #057dbc;
  background: #fff;
  color: #057dbc;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  cursor: pointer;
}

.restore-row-button:disabled {
  border-color: #b8b8b8;
  color: #757575;
  cursor: progress;
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
