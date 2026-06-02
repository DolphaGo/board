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
          {{ index + 1 }}. {{ imageUrl }}
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
  const separator = bodyText.value.length === 0 || bodyText.value.endsWith('\n') ? '' : '\n';
  bodyText.value += `${separator}${markdownImage}\n`;
  imageUrls.value = [...imageUrls.value, url];
  imageUploadMessage.value = '';
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
