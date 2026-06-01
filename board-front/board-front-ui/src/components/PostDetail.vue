<template>
  <div>
    <p v-if="loading">게시글을 불러오는 중...</p>
    <p v-else-if="error">게시글을 불러오지 못했습니다.</p>
    <article v-else-if="post" class="post-detail">
      <h1>
        <span v-if="post.notice" class="notice-badge">공지</span>
        <span>{{ post.title }}</span>
      </h1>
      <p>{{ post.content }}</p>
      <div v-if="post.imageUrls.length > 0" class="post-image-list" aria-label="본문 이미지">
        <img
          v-for="(imageUrl, index) in post.imageUrls"
          :key="`${post.id}:image:${imageUrl}`"
          :src="imageUrl"
          :alt="`${post.title} 이미지 ${index + 1}`"
          loading="lazy"
        />
      </div>
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

      <section class="comment-list" aria-label="댓글 목록">
        <p v-if="comments.length === 0" class="comment-empty">댓글이 없습니다.</p>
        <article v-for="comment in comments" :key="comment.id" class="comment-row">
          <strong>{{ comment.authorNickname }}</strong>
          <span>{{ formatCreatedAt(comment.createdAt) }}</span>
          <p>{{ comment.content }}</p>
        </article>
      </section>
    </article>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { postService, type CommentResponse, type PostResponse } from 'src/api/postService';

const route = useRoute();
const post = ref<PostResponse | null>(null);
const loading = ref(false);
const error = ref(false);
const commentContent = ref('');
const commentMessage = ref('');
const recommendMessage = ref('');
const actionError = ref(false);
const comments = ref<CommentResponse[]>([]);

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
      // 상세 진입 시 본문과 댓글을 같은 postId 기준으로 읽는다.
      // 댓글 API가 실패하면 화면 전체 계약이 깨진 것이므로 상세 오류 상태로 처리한다.
      const [postResponse, commentResponses] = await Promise.all([
        postService.getPost(id),
        postService.listComments(id),
      ]);
      post.value = postResponse;
      comments.value = commentResponses;
    } catch (err) {
      console.error('게시글 조회 실패:', err);
      post.value = null;
      comments.value = [];
      error.value = true;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true }
);

const formatCreatedAt = (createdAt: string) => createdAt.slice(0, 10).replaceAll('-', '.');

const submitComment = async () => {
  const id = postId.value;
  const content = commentContent.value.trim();

  if (id === null || content.length === 0) {
    return;
  }

  try {
    actionError.value = false;
    // 작성 API가 반환한 댓글을 현재 목록 끝에 붙여 즉시 피드백한다.
    // 서버 목록은 id 오름차순으로 내려오므로 새 댓글을 뒤에 추가하면 같은 읽기 순서를 유지할 수 있다.
    const comment = await postService.createComment(id, { content });
    comments.value = [...comments.value, comment];
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

.post-detail h1 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notice-badge {
  border: 1px solid #c40000;
  padding: 1px 5px;
  color: #c40000;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}

.post-meta {
  color: #777777;
  font-size: 13px;
}

.post-image-list {
  display: grid;
  gap: 10px;
  margin: 12px 0;
}

.post-image-list img {
  border: 1px solid #d8d8d8;
  max-width: 100%;
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

.comment-list {
  border-top: 1px solid #e0e0e0;
  margin-top: 16px;
  padding-top: 12px;
}

.comment-empty {
  color: #777777;
  font-size: 13px;
  margin: 0;
}

.comment-row {
  border-bottom: 1px solid #eeeeee;
  padding: 8px 0;
}

.comment-row strong {
  font-size: 13px;
}

.comment-row span {
  color: #777777;
  font-size: 12px;
  margin-left: 8px;
}

.comment-row p {
  font-size: 14px;
  line-height: 1.5;
  margin: 4px 0 0;
}
</style>
