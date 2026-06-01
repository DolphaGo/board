<template>
  <section class="post-list" aria-labelledby="post-list-title">
    <header class="board-header">
      <h2 id="post-list-title">게시글</h2>
      <span class="board-summary">최신순 3건</span>
    </header>

    <div class="board-rows">
      <article v-for="post in posts" :key="post.id" class="board-row">
        <a class="board-title-link" :href="`#/post/${post.id}`">
          {{ post.title }}
        </a>
        <p class="post-preview">{{ post.preview }}</p>
        <div class="meta-row">
          <span>{{ post.author }}</span>
          <span>{{ post.createdAt }}</span>
          <span>조회 {{ post.viewCount }}</span>
          <span>댓글 {{ post.commentCount }}</span>
          <span>추천 {{ post.recommendCount }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script lang="ts" setup>
const posts = [
  {
    id: 1,
    title: 'Elasticsearch 검색 스코어링 정리',
    preview: '제목 boost, 본문 match, 최신성 가중치를 게시판 검색에 적용하는 기준을 정리합니다.',
    author: 'study-user',
    createdAt: '2026.06.02',
    viewCount: 128,
    commentCount: 12,
    recommendCount: 7,
  },
  {
    id: 2,
    title: '실시간 검색 순위 기록 흐름',
    preview: '검색 요청과 랭킹 집계를 분리하고 polling UI로 시작하는 이유를 남깁니다.',
    author: 'search-lab',
    createdAt: '2026.06.01',
    viewCount: 86,
    commentCount: 4,
    recommendCount: 5,
  },
  {
    id: 3,
    title: '채팅방 WebSocket topic 분리',
    preview: '방 단위 topic으로 메시지를 발행해야 다른 채팅방 메시지가 섞이지 않습니다.',
    author: 'chat-lab',
    createdAt: '2026.06.01',
    viewCount: 64,
    commentCount: 8,
    recommendCount: 3,
  },
]
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
