<template>
  <div class="issue-container">
    <h2 class="title">Let's Write!</h2>
    <input
        id="issue-title"
        v-model="title"
        type="text"
        class="form-control title-input"
        placeholder="Title"
    />
    <div class="role-switch" aria-label="작성 권한">
      <button
          type="button"
          class="role-switch-button"
          :class="{ active: selectedAuthorRole === 'user' }"
          data-testid="role-user"
          @click="selectAuthorRole('user')"
      >
        일반
      </button>
      <button
          type="button"
          class="role-switch-button"
          :class="{ active: selectedAuthorRole === 'admin' }"
          data-testid="role-admin"
          @click="selectAuthorRole('admin')"
      >
        관리자
      </button>
    </div>
    <div class="tabs">
      <button
          :class="{ active: activeTab === 'write' }"
          @click="activeTab = 'write'"
      >
        쓰기 모드
      </button>
      <button
          :class="{ active: activeTab === 'preview' }"
          @click="activeTab = 'preview'"
      >
        읽기 모드
      </button>
    </div>
    <div v-if="activeTab === 'write'" class="form-group">
      <textarea
          id="issue-body"
          ref="bodyTextarea"
          v-model="bodyText"
          class="form-control body-input"
          placeholder="Leave a comment"
          rows="8"
          @paste="handlePaste"
      ></textarea>
    </div>
    <label v-if="isAdminEditor" class="notice-option">
      <input
          :checked="notice"
          type="checkbox"
          data-testid="notice-checkbox"
          @change="toggleNotice"
      />
      공지로 등록
    </label>
    <div class="image-url-panel">
      <label for="image-url-input">이미지 URL</label>
      <div class="image-url-controls">
        <input
            id="image-url-input"
            v-model="imageUrlInput"
            type="url"
            class="form-control image-url-input"
            data-testid="image-url-input"
            placeholder="https://cdn.example.com/image.png"
        />
        <button
            type="button"
            class="btn-image-add"
            data-testid="add-image-url"
            @click="addImageUrl"
        >
          추가
        </button>
      </div>
      <ol v-if="imageUrls.length > 0" class="image-url-list" aria-label="본문 이미지 URL">
        <li v-for="(imageUrl, index) in imageUrls" :key="`${imageUrl}:${index}`" class="image-url-item">
          <img
              class="image-url-thumbnail"
              data-testid="image-url-thumbnail"
              :src="imageUrl"
              :alt="`첨부 이미지 ${index + 1} 미리보기`"
              loading="lazy"
          />
          <span>{{ index + 1 }}. {{ imageUrl }}</span>
          <button
              type="button"
              class="btn-image-move"
              data-testid="move-image-up"
              :disabled="index === 0"
              @click="moveImageUrl(index, -1)"
          >
            위
          </button>
          <button
              type="button"
              class="btn-image-move"
              data-testid="move-image-down"
              :disabled="index === imageUrls.length - 1"
              @click="moveImageUrl(index, 1)"
          >
            아래
          </button>
          <button
              type="button"
              class="btn-image-remove"
              data-testid="remove-image-url"
              @click="removeImageUrl(index)"
          >
            삭제
          </button>
        </li>
      </ol>
      <p
          v-if="imageUploadMessage"
          class="image-upload-message"
          data-testid="image-upload-message"
      >
        {{ imageUploadMessage }}
      </p>
    </div>
    <div v-if="activeTab === 'preview'" class="markdown-preview">
      <div v-html="markdownPreview"></div>
    </div>
    <button data-testid="post-submit" @click="submit" class="btn-submit" :disabled="submitting">
      {{ submitting ? '저장 중...' : '작성하기' }}
    </button>
    <p v-if="submitMessage" class="submit-message" data-testid="submit-message">{{ submitMessage }}</p>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked';
import { request } from 'src';  // 'request' 객체를 사용하여 서버에 요청
import { postService } from 'src/api/postService';
import { submitPostEditorForm } from './postEditorSubmit';

const props = withDefaults(
    defineProps<{
      authorRole?: 'user' | 'admin'
    }>(),
    {
      authorRole: 'user',
    },
);

const router = useRouter();
const title = ref('');
const bodyText = ref('');
const bodyTextarea = ref<HTMLTextAreaElement | null>(null);
const imageUrls = ref<string[]>([]);
const imageUrlInput = ref('');
const imageUploadMessage = ref('');
const imageUploading = ref(false);
const notice = ref(false);
const selectedAuthorRole = ref<'user' | 'admin'>(props.authorRole);
const activeTab = ref('write');
const submitting = ref(false);
const submitMessage = ref('');

const isAdminEditor = computed(() => selectedAuthorRole.value === 'admin');

// Convert markdown to HTML using Marked
const markdownPreview = computed(() => {
  return marked(bodyText.value);
});

// Handle paste event for image upload
const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      if (imageUploading.value) {
        imageUploadMessage.value = '이미지 업로드 중입니다. 완료된 뒤 다시 붙여넣어 주세요.';
        return;
      }
      const file = item.getAsFile();
      if (file) {
        imageUploading.value = true;
        imageUploadMessage.value = '이미지 업로드 중입니다.';
        try {
          const url = await uploadImage(file);
          insertImageMarkdown(url);
        } catch (error) {
          console.error("Image upload failed", error);
          imageUploadMessage.value =
              '이미지 업로드에 실패했습니다. PNG, JPEG, GIF, WebP 이미지만 업로드할 수 있고 5MB까지 가능합니다.';
        } finally {
          imageUploading.value = false;
        }
      }
    }
  }
};

// Upload image to server
const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  // request 인스턴스의 baseURL이 이미 /api 이므로 여기서는 컨트롤러 하위 경로만 적는다.
  // 이렇게 두면 로컬 개발과 배포 환경의 API 호스트 변경은 src/index.ts 한 곳에서만 다루면 된다.
  const response = await request.postForm('/images', formData);
  const uploaded = response.data as { url?: string };

  if (!uploaded.url) {
    throw new Error('Invalid image upload response');
  }

  return uploaded.url;
};

// Insert image URL as Markdown
const insertImageMarkdown = (url: string) => {
  const imageNumber = imageUrls.value.length + 1;
  const markdownImage = `![첨부 이미지 ${imageNumber}](${url})`;
  const selectionStart = bodyTextarea.value?.selectionStart;
  const selectionEnd = bodyTextarea.value?.selectionEnd;
  if (typeof selectionStart === 'number' && typeof selectionEnd === 'number') {
    const beforeSelection = bodyText.value.slice(0, selectionStart);
    const afterSelection = bodyText.value.slice(selectionEnd);
    const beforeSeparator = beforeSelection.length === 0 || beforeSelection.endsWith('\n') ? '' : '\n';

    // 블로그형 글쓰기는 이미지를 글 끝에만 몰아넣지 않고 문단 사이에 끼워 넣는 흐름이 중요하다.
    // textarea selection을 기준으로 Markdown을 삽입하면 "본문 -> 이미지 -> 본문" 순서를 직접 조립하며 배울 수 있다.
    bodyText.value = `${beforeSelection}${beforeSeparator}${markdownImage}\n${afterSelection}`;
  } else {
    const separator = bodyText.value.length === 0 || bodyText.value.endsWith('\n') ? '' : '\n';
    bodyText.value += `${separator}${markdownImage}\n`;
  }
  imageUrls.value = [...imageUrls.value, url];
  imageUploadMessage.value = '';
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeImageMarkdownNumbers = () => {
  imageUrls.value.forEach((imageUrl, index) => {
    const markdownPattern = new RegExp(`!\\[첨부 이미지 \\d+\\]\\(${escapeRegExp(imageUrl)}\\)`, 'g');
    bodyText.value = bodyText.value.replace(markdownPattern, `![첨부 이미지 ${index + 1}](${imageUrl})`);
  });
};

const removeManagedImageMarkdown = () => {
  if (imageUrls.value.length === 0) {
    return;
  }

  const managedMarkdownPattern = new RegExp(
    `\\n?!\\[첨부 이미지 \\d+\\]\\((${imageUrls.value.map(escapeRegExp).join('|')})\\)\\n?`,
    'g',
  );

  bodyText.value = bodyText.value.replace(managedMarkdownPattern, '\n').replace(/\n{2,}/g, '\n').replace(/^\n/, '');
};

const appendManagedImageMarkdown = () => {
  imageUrls.value.forEach((imageUrl, index) => {
    const separator = bodyText.value.length === 0 || bodyText.value.endsWith('\n') ? '' : '\n';
    bodyText.value += `${separator}![첨부 이미지 ${index + 1}](${imageUrl})\n`;
  });
};

const rebuildManagedImageMarkdown = () => {
  if (imageUrls.value.length === 0) {
    removeManagedImageMarkdown();
    return;
  }

  // 순서 변경은 단순히 배열만 swap하면 본문 Markdown 순서가 그대로 남는다.
  // 그래서 현재 관리 중인 이미지 Markdown을 제거한 뒤, imageUrls 배열 순서대로 다시 붙여 저장 계약과 글 흐름을 맞춘다.
  removeManagedImageMarkdown();
  appendManagedImageMarkdown();
};

const removeImageUrl = (index: number) => {
  const imageUrl = imageUrls.value[index];

  if (!imageUrl) {
    return;
  }

  // 이미지 URL 목록은 저장용 배열이고, 본문 Markdown은 사용자가 실제로 읽는 글 흐름이다.
  // 삭제할 때 둘 중 하나만 지우면 상세 화면과 저장 DTO가 서로 다른 이미지를 가리키므로 항상 같이 갱신한다.
  const markdownPattern = new RegExp(`\\n?!\\[첨부 이미지 \\d+\\]\\(${escapeRegExp(imageUrl)}\\)\\n?`, 'g');
  bodyText.value = bodyText.value.replace(markdownPattern, '\n').replace(/\n{2,}/g, '\n').replace(/^\n/, '');
  imageUrls.value = imageUrls.value.filter((_, imageIndex) => imageIndex !== index);
  normalizeImageMarkdownNumbers();
};

const moveImageUrl = (index: number, direction: -1 | 1) => {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= imageUrls.value.length) {
    return;
  }

  const nextImageUrls = [...imageUrls.value];
  [nextImageUrls[index], nextImageUrls[nextIndex]] = [nextImageUrls[nextIndex], nextImageUrls[index]];
  imageUrls.value = nextImageUrls;
  rebuildManagedImageMarkdown();
};

const addImageUrl = () => {
  const imageUrl = imageUrlInput.value.trim();

  if (imageUrl.length === 0) {
    return;
  }

  // 수동 URL도 붙여넣기 업로드와 같은 Markdown 삽입 경로를 탄다.
  // 이렇게 해야 "본문 중간에 이미지가 들어가는 글"과 "게시글 이미지 URL 배열"을 같은 순서로 공부할 수 있다.
  insertImageMarkdown(imageUrl);
  imageUrlInput.value = '';
};

const toggleNotice = (event: Event) => {
  notice.value = event.target instanceof HTMLInputElement && event.target.checked;
};

const selectAuthorRole = (role: 'user' | 'admin') => {
  selectedAuthorRole.value = role;

  if (role === 'user') {
    // UI에서 관리자 모드로 공지를 체크했다가 일반 모드로 돌아오면
    // 백엔드 권한 검사 전에 프론트 payload도 일반 글 계약으로 되돌린다.
    notice.value = false;
  }
};

const findApiErrorMessage = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  const response = (error as { response?: unknown }).response;
  if (typeof response !== 'object' || response === null || !('data' in response)) {
    return undefined;
  }

  const data = (response as { data?: unknown }).data;
  if (typeof data === 'string' && data.trim().length > 0) {
    return data;
  }

  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    return typeof message === 'string' && message.trim().length > 0 ? message : undefined;
  }

  return undefined;
};

const submit = async () => {
  submitting.value = true;
  submitMessage.value = '';

  try {
    submitMessage.value = await submitPostEditorForm({
      title: title.value,
      content: bodyText.value,
      imageUrls: imageUrls.value,
      notice: isAdminEditor.value ? notice.value : false,
      createPost: postService.createPost,
      moveToPostDetail: postId => {
        router.push(`/post/${postId}`);
      },
    });
  } catch (error) {
    console.error('Post submit failed', error);
    // 백엔드 권한 검사는 최종 보안 경계다.
    // 프론트에서 관리자 모드를 켰더라도 API가 거절하면 서버 메시지를 보여줘 왜 막혔는지 학습할 수 있게 한다.
    submitMessage.value = findApiErrorMessage(error) ?? '게시글 저장에 실패했습니다.';
  } finally {
    submitting.value = false;
  }
};
</script>

<style>
.issue-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
}

.tabs {
  margin-bottom: 15px;
}

.tabs button {
  padding: 8px 16px;
  margin-right: 5px;
  font-size: 14px;
  cursor: pointer;
  background-color: #f6f8fa;
  border: 1px solid #d1d5da;
  border-radius: 6px;
}

.tabs button.active {
  background-color: #0366d6;
  color: white;
  border-color: #0366d6;
}

.form-group {
  margin-bottom: 20px;
}

.form-control {
  width: 100%;
  padding: 8px;
  font-size: 14px;
  border: 1px solid #d1d5da;
  border-radius: 6px;
  box-shadow: inset 0 1px 2px rgba(27,31,35,0.075);
}

.title-input {
  margin-bottom: 16px;
}

.role-switch {
  display: inline-flex;
  gap: 4px;
  margin: 0 0 14px;
}

.role-switch-button {
  background: #f6f8fa;
  border: 1px solid #d1d5da;
  color: #333333;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  min-height: 32px;
  padding: 0 12px;
}

.role-switch-button.active {
  background: #222222;
  border-color: #222222;
  color: #ffffff;
}

.body-input {
  margin-top: 10px;
  padding: 15px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  min-height: 180px;
  font-family: 'Arial', sans-serif;
}

.notice-option {
  align-items: center;
  display: inline-flex;
  gap: 6px;
  margin: 0 0 16px;
  color: #333333;
  font-size: 13px;
  font-weight: 700;
}

.image-url-panel {
  display: grid;
  gap: 8px;
  margin: 0 0 16px;
}

.image-url-panel label {
  font-size: 13px;
  font-weight: 700;
}

.image-url-controls {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.image-url-input {
  margin: 0;
}

.btn-image-add {
  background: #057dbc;
  border: 1px solid #04699d;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  min-height: 34px;
  padding: 0 12px;
}

.image-url-list {
  margin: 0;
  padding-left: 20px;
  color: #555555;
  font-size: 12px;
}

.image-url-item {
  align-items: center;
  display: flex;
  gap: 6px;
  margin: 4px 0;
}

.image-url-thumbnail {
  aspect-ratio: 1;
  border: 1px solid #d1d5da;
  flex: 0 0 48px;
  height: 48px;
  object-fit: cover;
  width: 48px;
}

.image-url-item span {
  flex: 1;
  overflow-wrap: anywhere;
}

.btn-image-move,
.btn-image-remove {
  background: #ffffff;
  border: 1px solid #d1d5da;
  color: #333333;
  cursor: pointer;
  font-size: 12px;
  min-height: 26px;
  padding: 0 8px;
}

.btn-image-move:disabled {
  color: #999999;
  cursor: not-allowed;
}

.image-upload-message {
  margin: 0;
  color: #b42318;
  font-size: 12px;
  font-weight: 700;
}

.markdown-preview {
  margin-top: 10px;
  padding: 15px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  background-color: #f6f8fa;
  min-height: 180px;
  font-family: 'Arial', sans-serif;
}

.markdown-preview blockquote {
  border-left: 4px solid #0366d6;
  margin: 1em 0;
  color: #0366d6;
  background-color: #f0f8ff;
  padding: 10px 15px;
  border-radius: 4px;
  font-style: italic;
}

.btn-submit {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 16px;
  font-size: 14px;
  color: #ffffff;
  background-color: #2ea44f;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-submit:hover {
  background-color: #2c974b;
}

.submit-message {
  margin: 12px 0 0;
  color: #555555;
  font-size: 13px;
}
</style>
