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
    <div v-if="activeTab === 'preview'" class="markdown-preview">
      <div v-html="markdownPreview"></div>
    </div>
    <button @click="submit" class="btn-submit">작성하기</button>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { marked } from 'marked';
import { request } from 'src';  // 'request' 객체를 사용하여 서버에 요청

const title = ref('');
const bodyText = ref('');
const activeTab = ref('write');

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
      const file = item.getAsFile();
      if (file) {
        try {
          const url = await uploadImage(file);
          insertImageMarkdown(url);
        } catch (error) {
          console.error("Image upload failed", error);
        }
      }
    }
  }
};

// Upload image to server
const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request.postForm('/v1/images/upload', formData);
  return response.data; // Assume server returns { url: "uploaded-image-url" }
};

// Insert image URL as Markdown
const insertImageMarkdown = (url: string) => {
  const markdownImage = `![alt text](${url})`;
  bodyText.value += `\n${markdownImage}\n`;
};

const submit = () => {
  console.log('Issue Submitted:', { title: title.value, body: bodyText.value });
  // Here you can add the logic to submit the issue to a server.
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

.body-input {
  margin-top: 10px;
  padding: 15px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  min-height: 180px;
  font-family: 'Arial', sans-serif;
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
</style>
