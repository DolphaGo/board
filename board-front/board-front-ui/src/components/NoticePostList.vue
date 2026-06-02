<template>
  <section class="notice-post-list" aria-labelledby="notice-post-list-title">
    <header class="board-header">
      <h2 id="notice-post-list-title">공지사항</h2>
      <span class="board-summary">고정 공지 {{ posts.length }}건</span>
    </header>

    <p v-if="loading" class="board-message">공지사항을 불러오는 중...</p>
    <p v-else-if="error" class="board-message">공지사항을 불러오지 못했습니다.</p>
    <p v-else-if="posts.length === 0" class="board-message">등록된 공지사항이 없습니다.</p>

    <div v-else class="board-rows">
      <article v-for="post in posts" :key="post.id" class="board-row">
        <router-link class="board-title-link" :to="`/post/${post.id}`">
          <span class="notice-badge">공지</span>
          <span class="board-title-text">{{ post.title }}</span>
        </router-link>
        <!-- 공지도 일반 글과 같은 상세/숨김 API를 사용한다.
             학습용 관리자 진입은 role=admin query로 연결해 상세 화면에서 숨김 버튼까지 바로 확인할 수 있게 한다. -->
        <router-link
          class="notice-admin-link"
          data-testid="notice-admin-detail-link"
          :to="`/post/${post.id}?role=admin`"
        >
          관리자 보기
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
  // 공지는 운영 안내를 빠르게 훑는 화면이라 날짜 단위만 보여준다.
  // 상세한 시간과 본문 확인은 게시글 상세 화면으로 넘기는 구조가 목록을 단순하게 만든다.
  return createdAt.slice(0, 10).replaceAll('-', '.')
}

const fetchNoticePosts = async () => {
  try {
    loading.value = true
    error.value = false
    // 공지 목록은 일반 목록 API에서 notice=true만 추리는 학습용 구현이다.
    // 이후 백엔드에 /api/posts/notices가 생기면 postService만 바꾸고 화면은 그대로 둘 수 있다.
    posts.value = await postService.listNoticePosts()
  } catch (err) {
    console.error('공지사항 조회 실패:', err)
    posts.value = []
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchNoticePosts)
</script>

<style scoped>
.notice-post-list {
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

.notice-admin-link {
  display: inline-block;
  margin-left: 8px;
  color: #555555;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.notice-admin-link:hover {
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
</style>
