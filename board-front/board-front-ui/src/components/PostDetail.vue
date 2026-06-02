<template>
  <div>
    <p v-if="loading">게시글을 불러오는 중...</p>
    <p v-else-if="error">게시글을 불러오지 못했습니다.</p>
    <article v-else-if="post" class="post-detail">
      <template v-if="post.display">
        <h1>
          <span v-if="post.notice" class="notice-badge">공지</span>
          <span>{{ post.title }}</span>
        </h1>
        <div class="post-content" data-testid="post-content" v-html="renderedPostContent"></div>
        <div v-if="fallbackImageUrls.length > 0" class="post-image-list" aria-label="본문 이미지">
          <img
            v-for="(imageUrl, index) in fallbackImageUrls"
            :key="`${post.id}:image:${imageUrl}`"
            :src="imageUrl"
            :alt="`${post.title} 이미지 ${index + 1}`"
            loading="lazy"
          />
        </div>
        <ol v-if="postImageFlowRows.length > 0" class="post-image-flow" data-testid="post-image-flow">
          <li
            v-for="row in postImageFlowRows"
            :key="row.url"
            data-testid="post-image-flow-row"
          >
            <strong>{{ row.index }}. {{ row.stateLabel }}</strong>: {{ row.description }}
          </li>
        </ol>
        <p class="post-meta">
          <span v-if="post.authorNickname">{{ post.authorNickname }}</span>
          <span v-if="post.createdAt">{{ formatCreatedAt(post.createdAt) }}</span>
          <span>조회수 {{ post.viewCount }}</span>
          <span>댓글 {{ detailCommentCount }}</span>
          <span>추천 {{ detailRecommendCount }}</span>
        </p>

        <div class="post-actions" aria-label="게시글 액션">
          <button
            type="button"
            class="recommend-button"
            data-testid="recommend-button"
            :disabled="recommendSubmitted"
            @click="submitRecommend"
          >
            {{ recommendSubmitted ? '추천 완료' : '추천' }}
          </button>
          <button
            v-if="isAdminViewer"
            type="button"
            class="hide-button"
            data-testid="hide-post"
            @click="hidePost"
          >
            숨김
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
      </template>

      <div v-else class="hidden-post" data-testid="hidden-post">
        <p>숨김 처리된 게시글입니다.</p>
        <p v-if="isAdminViewer" class="hidden-post-guide" data-testid="hidden-post-admin-guide">
          관리자는 복구 버튼으로 게시글을 다시 노출할 수 있습니다.
        </p>
        <button
          v-if="isAdminViewer"
          type="button"
          class="restore-button"
          data-testid="restore-post"
          @click="restorePost"
        >
          복구
        </button>
      </div>

      <p v-if="commentMessage" class="action-message">{{ commentMessage }}</p>
      <p v-if="recommendMessage" class="action-message">{{ recommendMessage }}</p>
      <p v-if="moderationMessage" class="action-message" data-testid="post-action-message">
        {{ moderationMessage }}
      </p>
      <p v-if="actionError" class="action-error" data-testid="post-action-error">{{ actionError }}</p>

      <section v-if="post.display" class="comment-list" aria-label="댓글 목록">
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
import { marked } from 'marked';
import { postService, type CommentResponse, type PostResponse } from 'src/api/postService';
import { sanitizeRenderedMarkdown } from 'src/markdown/sanitizeRenderedMarkdown';

type AuthorRole = 'user' | 'admin';

const props = withDefaults(
  defineProps<{
    authorRole?: AuthorRole
  }>(),
  {
    authorRole: 'user',
  }
);

const route = useRoute();
const post = ref<PostResponse | null>(null);
const loading = ref(false);
const error = ref(false);
const commentContent = ref('');
const commentMessage = ref('');
const recommendMessage = ref('');
const recommendSubmitted = ref(false);
const moderationMessage = ref('');
const actionError = ref('');
const comments = ref<CommentResponse[]>([]);

const isAdminViewer = computed(() => props.authorRole === 'admin');
const detailCommentCount = computed(() => post.value?.commentCount ?? comments.value.length);
const detailRecommendCount = computed(() => post.value?.recommendCount ?? 0);

const isImageUrlInBody = (imageUrl: string) => post.value?.content.includes(`](${imageUrl})`) ?? false;

const renderedPostContent = computed(() => {
  if (!post.value?.display) {
    return '';
  }

  // 글쓰기 화면은 imageUrls 배열과 Markdown 본문을 함께 저장한다.
  // 상세 화면에서 실제 독자가 보는 이미지 위치는 Markdown 순서가 결정하므로 본문은 Markdown으로 렌더링한다.
  return sanitizeRenderedMarkdown(marked(post.value.content, { async: false }) as string);
});

const fallbackImageUrls = computed(() => {
  if (!post.value?.display) {
    return [];
  }

  // imageUrls는 검색 색인과 첨부 관리용 배열이고, Markdown 본문은 독자가 실제로 보는 이미지 위치다.
  // 본문에 이미 들어간 이미지를 하단 첨부 목록에 다시 그리면 같은 사진이 두 번 보여서 블로그형 글 흐름이 깨진다.
  return post.value.imageUrls.filter(imageUrl => !isImageUrlInBody(imageUrl));
});

const postImageFlowRows = computed(() => {
  if (!post.value?.display) {
    return [];
  }

  return post.value.imageUrls.map((imageUrl, index) => {
    const includedInBody = isImageUrlInBody(imageUrl);

    return {
      index: index + 1,
      url: imageUrl,
      stateLabel: includedInBody ? '본문 Markdown' : '하단 첨부',
      // 상세 화면은 글쓰기에서 저장된 Markdown 본문과 imageUrls 배열을 같이 받는다.
      // Markdown 안에 있는 이미지는 정확한 문단 위치를 보존하고, 배열에만 남은 이미지는 누락되지 않도록 하단에 보인다.
      description: includedInBody
        ? `첨부 이미지 ${index + 1}은 글 흐름 위치에 렌더링되어 하단 첨부 목록에서 숨깁니다.`
        : `첨부 이미지 ${index + 1}은 Markdown 본문에 없어 하단 첨부 이미지로 보여줍니다.`,
    };
  });
});

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

const findApiErrorMessage = (err: unknown) => {
  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return '요청을 처리하지 못했습니다.';
  }

  const response = (err as { response?: { data?: { message?: unknown } } }).response;
  const message = response?.data?.message;

  return typeof message === 'string' && message.trim().length > 0
    ? message
    : '요청을 처리하지 못했습니다.';
};

const submitComment = async () => {
  const id = postId.value;
  const content = commentContent.value.trim();

  if (id === null || content.length === 0) {
    return;
  }

  try {
    actionError.value = '';
    // 작성 API가 반환한 댓글을 현재 목록 끝에 붙여 즉시 피드백한다.
    // 서버 목록은 id 오름차순으로 내려오므로 새 댓글을 뒤에 추가하면 같은 읽기 순서를 유지할 수 있다.
    const comment = await postService.createComment(id, { content });
    comments.value = [...comments.value, comment];
    if (post.value) {
      // 상세 API의 commentCount는 목록과 같은 서버 집계 기준이다.
      // 댓글 작성 직후에는 전체 상세를 다시 읽지 않고 현재 기준값만 1 올려 메타 수치를 즉시 맞춘다.
      post.value = {
        ...post.value,
        commentCount: detailCommentCount.value + 1,
      };
    }
    commentContent.value = '';
    commentMessage.value = '댓글이 저장되었습니다.';
  } catch (err) {
    console.error('댓글 작성 실패:', err);
    actionError.value = findApiErrorMessage(err);
  }
};

const submitRecommend = async () => {
  const id = postId.value;

  if (id === null) {
    return;
  }

  try {
    actionError.value = '';
    await postService.createRecommend(id);
    if (post.value) {
      // 상세 API가 내려준 recommendCount는 현재 화면의 기준값이다.
      // 추천 성공 직후에는 같은 게시글을 다시 조회하지 않고 로컬 값만 1 올려 버튼 피드백과 메타 수치를 함께 맞춘다.
      post.value = {
        ...post.value,
        recommendCount: detailRecommendCount.value + 1,
      };
    }
    // 백엔드도 같은 회원의 중복 추천을 막지만, 성공 직후 버튼을 닫아 두면 사용자가 같은 액션을 반복 전송하지 않는다.
    // 버튼 상태와 카운트 갱신을 같이 처리해야 클릭 결과가 게시판 메타에 바로 드러난다.
    recommendSubmitted.value = true;
    recommendMessage.value = '추천을 반영했습니다.';
  } catch (err) {
    console.error('추천 실패:', err);
    actionError.value = findApiErrorMessage(err);
  }
};

const hidePost = async () => {
  const id = postId.value;

  if (id === null || !isAdminViewer.value) {
    return;
  }

  try {
    actionError.value = '';
    // 숨김 처리 결과는 백엔드가 권한과 display=false 상태를 확정한 뒤 반환한다.
    // 화면은 반환 DTO로 교체해서 버튼을 즉시 없애고 실제 서버 상태와 맞춘다.
    post.value = await postService.hidePost(id);
    moderationMessage.value = '게시글을 숨겼습니다.';
  } catch (err) {
    console.error('게시글 숨김 실패:', err);
    actionError.value = findApiErrorMessage(err);
  }
};

const restorePost = async () => {
  const id = postId.value;

  if (id === null || !isAdminViewer.value) {
    return;
  }

  try {
    actionError.value = '';
    // 복구도 백엔드가 권한과 display=true 상태를 확정한 DTO로 화면을 교체한다.
    // 성공하면 기존 마스킹 안내가 사라지고 일반 상세 본문/액션 영역이 다시 보인다.
    post.value = await postService.restorePost(id);
    moderationMessage.value = '게시글을 복구했습니다.';
  } catch (err) {
    console.error('게시글 복구 실패:', err);
    actionError.value = findApiErrorMessage(err);
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
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #777777;
  font-size: 13px;
}

.post-content {
  font-size: 14px;
  line-height: 1.6;
}

.post-content img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 10px 0;
  border: 1px solid #d8d8d8;
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

.post-image-flow {
  background: #f7f9fb;
  border: 1px solid #d8e1ea;
  color: #333333;
  font-size: 13px;
  line-height: 1.5;
  margin: 12px 0;
  padding: 10px 12px 10px 28px;
}

.post-image-flow li + li {
  margin-top: 4px;
}

.hidden-post {
  border: 1px solid #d8d8d8;
  color: #777777;
  font-size: 14px;
  margin: 0;
  padding: 16px;
  text-align: center;
}

.hidden-post p {
  margin: 0;
}

.hidden-post-guide {
  color: #555555;
  margin-top: 8px;
}

.post-actions {
  border-top: 1px solid #e0e0e0;
  margin-top: 16px;
  padding-top: 12px;
}

.recommend-button,
.hide-button,
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

.hide-button {
  background: #c62828;
  border-color: #a91f1f;
  margin-left: 8px;
}

.restore-button {
  background: #057dbc;
  border: 1px solid #04699d;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  margin-top: 10px;
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
