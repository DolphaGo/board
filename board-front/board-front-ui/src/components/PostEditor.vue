<template>
  <div class="post-editor-shell" data-testid="post-editor-shell">
    <header class="post-editor-hero">
      <div>
        <p class="post-editor-kicker">Board Composer</p>
        <h2 class="title" data-testid="post-editor-title">새 글 작성</h2>
        <p class="post-editor-helper" data-testid="post-editor-helper">
          본문 흐름에 이미지를 배치하고, 미리보기에서 저장될 Markdown 순서를 확인합니다.
        </p>
      </div>
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
    </header>

    <div class="post-editor-grid">
      <section class="post-editor-main">
        <input
            id="issue-title"
            v-model="title"
            type="text"
            class="form-control title-input"
            placeholder="제목을 입력하세요"
        />
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
              placeholder="본문을 작성하고 원하는 위치에 이미지를 추가하세요"
              rows="8"
              @paste="handlePaste"
          ></textarea>
        </div>
        <div v-if="activeTab === 'preview'" class="markdown-preview">
          <p class="markdown-preview-guide" data-testid="markdown-preview-guide">
            미리보기는 본문 Markdown 기준입니다. imageUrls 배열은 서버 저장/검색 색인용이고, 글에서 보이는 위치는 Markdown 순서가 결정합니다.
          </p>
          <ol v-if="markdownImageFlowRows.length > 0" class="markdown-image-flow" data-testid="markdown-image-flow">
            <li
                v-for="row in markdownImageFlowRows"
                :key="row.url"
                data-testid="markdown-image-flow-row"
            >
              <strong>{{ row.index }}. {{ row.stateLabel }}</strong>: {{ row.description }}
            </li>
          </ol>
          <div v-html="markdownPreview"></div>
        </div>
      </section>

      <aside class="post-editor-side">
        <label v-if="isAdminEditor" class="notice-option">
          <input
              :checked="notice"
              type="checkbox"
              data-testid="notice-checkbox"
              @change="toggleNotice"
          />
          공지로 등록
        </label>
        <div class="image-url-panel" data-testid="post-editor-image-panel">
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
              <span
                  class="image-url-body-state"
                  data-testid="image-url-body-state"
              >
                {{ imageUrlBodyStateLabel(imageUrl) }}
              </span>
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
        <div class="post-editor-action-rail" data-testid="post-editor-action-rail">
          <span class="post-editor-action-copy">저장 전 미리보기로 이미지 흐름을 확인하세요.</span>
          <button data-testid="post-submit" @click="submit" class="btn-submit" :disabled="submitting">
            {{ submitting ? '저장 중...' : '작성하기' }}
          </button>
        </div>
        <p v-if="submitMessage" class="submit-message" data-testid="submit-message">{{ submitMessage }}</p>
      </aside>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked';
import { request } from 'src';  // 'request' 객체를 사용하여 서버에 요청
import { postService } from 'src/api/postService';
import { sanitizeRenderedMarkdown } from 'src/markdown/sanitizeRenderedMarkdown';
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
  return sanitizeRenderedMarkdown(marked(bodyText.value, { async: false }) as string);
});

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createImageMarkdownPattern = (imageUrl: string, flags = '') =>
    new RegExp(`!\\[([^\\]]*)\\]\\(${escapeRegExp(imageUrl)}\\)`, flags);

const normalizeImageAltText = (altText: string, fallback: string): string => {
  const normalizedAltText = altText
      .replace(/[\[\]\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  return normalizedAltText.length > 0 ? normalizedAltText : fallback;
};

const findImageAltText = (imageUrl: string): string | undefined => {
  const match = createImageMarkdownPattern(imageUrl).exec(bodyText.value);

  return match?.[1];
};

const imageAltTextForPosition = (
    imageUrl: string,
    index: number,
    preservedAltTexts: Record<string, string | undefined> = {},
): string => {
  const existingAltText = preservedAltTexts[imageUrl] ?? findImageAltText(imageUrl);
  const fallbackAltText = `첨부 이미지 ${index + 1}`;

  if (!existingAltText || /^첨부 이미지 \d+$/.test(existingAltText)) {
    return fallbackAltText;
  }

  return normalizeImageAltText(existingAltText, fallbackAltText);
};

const imagePlacementLabel = (imageUrl: string): string => {
  const markdownPattern = createImageMarkdownPattern(imageUrl);
  const match = markdownPattern.exec(bodyText.value);

  if (!match) {
    return '본문 밖';
  }

  const textBeforeImage = bodyText.value.slice(0, match.index);
  const paragraphCount = textBeforeImage
      .split(/\n{2,}|\n/)
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0).length;

  // 블로그형 글쓰기는 이미지가 "첨부 목록 몇 번째"인지보다 "어느 문단 뒤에 놓였는지"가 읽기 흐름에 더 중요하다.
  // Markdown에서 이미지 태그 앞의 텍스트 문단 수를 세면 별도 에디터 모델 없이도 문단-이미지 배치를 설명할 수 있다.
  return paragraphCount === 0 ? '글 첫머리' : `${paragraphCount}번째 문단 뒤`;
};

const markdownImageFlowRows = computed(() =>
    imageUrls.value.map((imageUrl, index) => {
      const includedInBody = isImageUrlInBody(imageUrl);
      const placementLabel = imagePlacementLabel(imageUrl);

      return {
        index: index + 1,
        url: imageUrl,
        stateLabel: includedInBody ? '본문 포함' : '본문에서 제거됨',
        placementLabel,
        // preview는 "Markdown이 실제 글 흐름"이라는 점을 보여주는 학습 화면이다.
        // imageUrls 배열에 URL이 남아 있어도 Markdown 본문에서 빠지면 저장 직전에 제외되므로,
        // 사용자는 여기서 블로그형 본문 순서와 저장 payload가 어떻게 맞춰지는지 확인할 수 있다.
        description: includedInBody
            ? `첨부 이미지 ${index + 1}은 현재 Markdown 위치에 렌더링되고 저장됩니다. 배치: ${placementLabel}.`
            : `첨부 이미지 ${index + 1}은 Markdown에서 빠져 저장 payload에서도 제외됩니다.`,
      };
    }),
);

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

const moveBodyCursorAfterRender = (position: number) => {
  void nextTick(() => {
    bodyTextarea.value?.setSelectionRange(position, position);
  });
};

// Insert image URL as Markdown
const insertImageMarkdown = (url: string) => {
  const imageNumber = imageUrls.value.length + 1;
  const selectionStart = bodyTextarea.value?.selectionStart;
  const selectionEnd = bodyTextarea.value?.selectionEnd;
  if (typeof selectionStart === 'number' && typeof selectionEnd === 'number') {
    const beforeSelection = bodyText.value.slice(0, selectionStart);
    const selectedText = bodyText.value.slice(selectionStart, selectionEnd);
    const afterSelection = bodyText.value.slice(selectionEnd);
    const imageAltText = normalizeImageAltText(selectedText, `첨부 이미지 ${imageNumber}`);
    const markdownImage = `![${imageAltText}](${url})`;
    const beforeSeparator = beforeSelection.length === 0 || beforeSelection.endsWith('\n') ? '' : '\n';
    const afterSeparator = selectedText.trim().length > 0 || afterSelection.startsWith('\n') ? '' : '\n';

    // 블로그형 글쓰기는 이미지를 글 끝에만 몰아넣지 않고 문단 사이에 끼워 넣는 흐름이 중요하다.
    // textarea selection을 기준으로 Markdown을 삽입하면 "본문 -> 이미지 -> 본문" 순서를 직접 조립하며 배울 수 있다.
    // 선택한 텍스트가 있으면 그 텍스트를 이미지 alt로 써서 상세 화면과 검색 preview에서 이미지 의미가 사라지지 않게 한다.
    bodyText.value = `${beforeSelection}${beforeSeparator}${markdownImage}${afterSeparator}${afterSelection}`;
    moveBodyCursorAfterRender(beforeSelection.length + beforeSeparator.length + markdownImage.length + afterSeparator.length);
  } else {
    const markdownImage = `![첨부 이미지 ${imageNumber}](${url})`;
    const separator = bodyText.value.length === 0 || bodyText.value.endsWith('\n') ? '' : '\n';
    bodyText.value += `${separator}${markdownImage}\n`;
    moveBodyCursorAfterRender(bodyText.value.length);
  }
  imageUrls.value = [...imageUrls.value, url];
  imageUploadMessage.value = '';
};

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
    `\\n?!\\[[^\\]]*\\]\\((${imageUrls.value.map(escapeRegExp).join('|')})\\)\\n?`,
    'g',
  );

  bodyText.value = bodyText.value.replace(managedMarkdownPattern, '\n').replace(/\n{2,}/g, '\n').replace(/^\n/, '');
};

const appendManagedImageMarkdown = (preservedAltTexts: Record<string, string | undefined> = {}) => {
  imageUrls.value.forEach((imageUrl, index) => {
    const separator = bodyText.value.length === 0 || bodyText.value.endsWith('\n') ? '' : '\n';
    bodyText.value += `${separator}![${imageAltTextForPosition(imageUrl, index, preservedAltTexts)}](${imageUrl})\n`;
  });
};

const rebuildManagedImageMarkdown = () => {
  if (imageUrls.value.length === 0) {
    removeManagedImageMarkdown();
    return;
  }

  // 순서 변경은 단순히 배열만 swap하면 본문 Markdown 순서가 그대로 남는다.
  // 그래서 현재 관리 중인 이미지 Markdown을 제거한 뒤, imageUrls 배열 순서대로 다시 붙여 저장 계약과 글 흐름을 맞춘다.
  // 이때 사용자가 직접 고른 alt 텍스트는 이미지 의미이므로 URL별로 먼저 보존하고, 기본 "첨부 이미지 n"만 새 순서로 다시 번호를 맞춘다.
  const preservedAltTexts = Object.fromEntries(
      imageUrls.value.map(imageUrl => [imageUrl, findImageAltText(imageUrl)]),
  );
  removeManagedImageMarkdown();
  appendManagedImageMarkdown(preservedAltTexts);
};

const removeImageUrl = (index: number) => {
  const imageUrl = imageUrls.value[index];

  if (!imageUrl) {
    return;
  }

  // 이미지 URL 목록은 저장용 배열이고, 본문 Markdown은 사용자가 실제로 읽는 글 흐름이다.
  // 삭제할 때 둘 중 하나만 지우면 상세 화면과 저장 DTO가 서로 다른 이미지를 가리키므로 항상 같이 갱신한다.
  const markdownPattern = new RegExp(`\\n?!\\[[^\\]]*\\]\\(${escapeRegExp(imageUrl)}\\)\\n?`, 'g');
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

const isImageUrlInBody = (imageUrl: string) => bodyText.value.includes(`](${imageUrl})`);

const imageUrlBodyStateLabel = (imageUrl: string) => isImageUrlInBody(imageUrl) ? '본문 포함' : '본문에서 제거됨';

const prepareImagePayloadFromBody = () => {
  const remainingImageUrls = imageUrls.value.filter(isImageUrlInBody);
  let content = bodyText.value;

  remainingImageUrls.forEach((imageUrl, index) => {
    const markdownPattern = createImageMarkdownPattern(imageUrl, 'g');
    content = content.replace(markdownPattern, (_, altText: string) => {
      const fallbackAltText = `첨부 이미지 ${index + 1}`;
      const nextAltText = /^첨부 이미지 \d+$/.test(altText)
          ? fallbackAltText
          : normalizeImageAltText(altText, fallbackAltText);

      return `![${nextAltText}](${imageUrl})`;
    });
  });

  // 사용자가 textarea에서 이미지 Markdown을 직접 지울 수 있으므로, 저장 직전에는 본문을 진실의 원천으로 본다.
  // imageUrls 배열에만 남은 URL을 그대로 보내면 상세 화면의 fallback 첨부 목록에서 지운 사진이 되살아난다.
  return {
    content,
    imageUrls: remainingImageUrls,
  };
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

watch(
  () => props.authorRole,
  role => {
    // Vue Router는 같은 컴포넌트를 재사용하면서 query만 바꿀 수 있다.
    // role query가 바뀌어 prop만 갱신되는 경우에도 화면 권한과 notice payload가 이전 상태에 머물지 않게 맞춘다.
    selectAuthorRole(role);
  },
);

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
    const imagePayload = prepareImagePayloadFromBody();
    submitMessage.value = await submitPostEditorForm({
      title: title.value,
      content: imagePayload.content,
      imageUrls: imagePayload.imageUrls,
      notice: isAdminEditor.value ? notice.value : false,
      actorRole: selectedAuthorRole.value,
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
.post-editor-shell {
  max-width: 1180px;
  margin: 20px auto;
  padding: 0;
  border: 1px solid #d9e1e8;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2933;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.post-editor-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px;
  border-bottom: 1px solid #d9e1e8;
  background:
    linear-gradient(180deg, #f8fbfd 0%, #ffffff 100%);
}

.post-editor-kicker {
  margin: 0 0 6px;
  color: #057dbc;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.title {
  margin: 0;
  color: #111827;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.2;
}

.post-editor-helper {
  max-width: 620px;
  margin: 8px 0 0;
  color: #53606c;
  font-size: 13px;
  line-height: 1.55;
}

.post-editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 0;
}

.post-editor-main {
  min-width: 0;
  padding: 22px 24px 24px;
}

.post-editor-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-left: 1px solid #e5ebf0;
  background: #fbfcfd;
  padding: 22px 18px;
}

.tabs {
  display: inline-flex;
  gap: 2px;
  margin: 0 0 14px;
  border: 1px solid #cfd7de;
  background: #f4f6f8;
  padding: 3px;
}

.tabs button {
  min-height: 32px;
  border: 0;
  background: transparent;
  color: #53606c;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  padding: 0 14px;
}

.tabs button.active {
  background: #ffffff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.form-group {
  margin-bottom: 20px;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #cfd7de;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: none;
}

.title-input {
  margin-bottom: 14px;
  min-height: 46px;
  color: #111827;
  font-size: 20px;
  font-weight: 800;
}

.role-switch {
  display: inline-flex;
  gap: 4px;
  margin: 0;
  border: 1px solid #cfd7de;
  background: #ffffff;
  padding: 3px;
}

.role-switch-button {
  background: transparent;
  border: 0;
  color: #333333;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  min-height: 32px;
  padding: 0 12px;
}

.role-switch-button.active {
  background: #222222;
  color: #ffffff;
}

.body-input {
  padding: 16px;
  border: 1px solid #d9e1e8;
  border-radius: 8px;
  min-height: 430px;
  color: #1f2933;
  font-family: Arial, sans-serif;
  line-height: 1.65;
  resize: vertical;
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
  gap: 10px;
  margin: 0;
  border: 1px solid #e5ebf0;
  background: #ffffff;
  padding: 14px;
}

.image-url-panel label {
  font-size: 13px;
  font-weight: 700;
}

.image-url-controls {
  display: grid;
  grid-template-columns: 1fr;
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
  padding-left: 0;
  color: #555555;
  font-size: 12px;
  list-style: none;
}

.image-url-item {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
  border-top: 1px solid #edf1f4;
  padding-top: 8px;
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

.image-url-body-state {
  flex: 0 0 auto;
  border: 1px solid #d1d5da;
  background: #f6f8fa;
  color: #555555;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
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
  padding: 18px;
  border: 1px solid #d9e1e8;
  border-radius: 8px;
  background: #ffffff;
  min-height: 430px;
  font-family: Arial, sans-serif;
  line-height: 1.65;
}

.markdown-preview-guide {
  margin: 0 0 12px;
  padding: 8px 10px;
  border-left: 3px solid #057dbc;
  background: #ffffff;
  color: #555555;
  font-size: 12px;
  font-weight: 700;
}

.markdown-image-flow {
  margin: 8px 0 12px;
  padding-left: 18px;
  color: #333333;
  font-size: 12px;
  line-height: 1.5;
}

.markdown-image-flow li + li {
  margin-top: 4px;
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

.markdown-preview img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 10px 0;
  border: 1px solid #d1d5da;
  border-radius: 4px;
}

.btn-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0;
  width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  color: #ffffff;
  background-color: #111827;
  border: 1px solid #111827;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 800;
  min-height: 42px;
}

.btn-submit:hover {
  background-color: #057dbc;
  border-color: #057dbc;
}

.post-editor-action-rail {
  display: grid;
  gap: 10px;
  border: 1px solid #d9e1e8;
  background: #ffffff;
  padding: 14px;
}

.post-editor-action-copy {
  color: #53606c;
  font-size: 12px;
  line-height: 1.45;
}

.submit-message {
  margin: 12px 0 0;
  color: #555555;
  font-size: 13px;
}

@media (max-width: 900px) {
  .post-editor-hero,
  .post-editor-grid {
    display: block;
  }

  .post-editor-side {
    border-left: 0;
    border-top: 1px solid #e5ebf0;
  }
}
</style>
