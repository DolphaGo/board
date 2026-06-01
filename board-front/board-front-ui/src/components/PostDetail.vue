<template>
  <div>
    <p v-if="loading">게시글을 불러오는 중...</p>
    <p v-else-if="error">게시글을 불러오지 못했습니다.</p>
    <article v-else-if="post" class="post-detail">
      <h1>{{ post.title }}</h1>
      <p>{{ post.content }}</p>
      <p class="post-meta">조회수 {{ post.viewCount }}</p>

      <div class="post-actions" aria-label="게시글 액션">
        <button
          type="button"
          class="recommend-button"
          data-testid="recommend-button"
          @click="submitRecommend"
        >
          추천
        </button>
      </div>

      <form class="comment-form" data-testid="comment-submit" @submit.prevent="submitComment">
        <label for="comment-content">댓글</label>
        <textarea
          id="comment-content"
          v-model="commentContent"
          data-testid="comment-content"
          rows="3"
          placeholder="댓글을 입력하세요"
        />
        <button type="submit">댓글 등록</button>
      </form>

      <p v-if="commentMessage" class="action-message">{{ commentMessage }}</p>
      <p v-if="recommendMessage" class="action-message">{{ recommendMessage }}</p>
      <p v-if="actionError" class="action-error">요청을 처리하지 못했습니다.</p>
    </article>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { postService, type PostResponse } from 'src/api/postService';

const route = useRoute();
const post = ref<PostResponse | null>(null);
const loading = ref(false);
const error = ref(false);
const commentContent = ref('');
const commentMessage = ref('');
const recommendMessage = ref('');
const actionError = ref(false);

const postId = computed(() => {
  const id = Number(route.params.id);

  return Number.isFinite(id) ? id : null;
});

watch(
  postId,
  async id => {
    if (id === null) {
      post.value = null;
      error.value = true;
      return;
    }

    try {
      loading.value = true;
      error.value = false;
      post.value = await postService.getPost(id);
    } catch (err) {
      console.error('게시글 조회 실패:', err);
      post.value = null;
      error.value = true;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true }
);

const submitComment = async () => {
  const id = postId.value;
  const content = commentContent.value.trim();

  if (id === null || content.length === 0) {
    return;
  }

  try {
    actionError.value = false;
    // 상세 화면은 댓글 목록 API가 생기기 전까지 작성 성공만 즉시 피드백한다.
    // 새로고침이나 목록 재진입 시 백엔드의 commentCount 집계에 반영된다.
    await postService.createComment(id, { content });
    commentContent.value = '';
    commentMessage.value = '댓글이 저장되었습니다.';
  } catch (err) {
    console.error('댓글 작성 실패:', err);
    actionError.value = true;
  }
};

const submitRecommend = async () => {
  const id = postId.value;

  if (id === null) {
    return;
  }

  try {
    actionError.value = false;
    // 추천 수 증가는 목록 메타 API에서 다시 읽는다.
    // 여기서는 사용자가 클릭 결과를 알 수 있도록 성공 메시지만 표시한다.
    await postService.createRecommend(id);
    recommendMessage.value = '추천을 반영했습니다.';
  } catch (err) {
    console.error('추천 실패:', err);
    actionError.value = true;
  }
};
</script>

<style scoped>
.post-detail {
  background: #ffffff;
  border-top: 2px solid #000000;
  color: #000000;
  padding: 12px;
}

.post-meta {
  color: #777777;
  font-size: 13px;
}

.post-actions {
  border-top: 1px solid #e0e0e0;
  margin-top: 16px;
  padding-top: 12px;
}

.recommend-button,
.comment-form button {
  background: #057dbc;
  border: 1px solid #04699d;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  min-height: 32px;
  padding: 0 12px;
}

.comment-form {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.comment-form label {
  font-size: 13px;
  font-weight: 700;
}

.comment-form textarea {
  border: 1px solid #c7c7c7;
  font: inherit;
  line-height: 1.5;
  min-height: 76px;
  padding: 8px;
  resize: vertical;
}

.action-message,
.action-error {
  font-size: 13px;
  margin: 10px 0 0;
}

.action-message {
  color: #057dbc;
}

.action-error {
  color: #c62828;
}
</style>
