<template>
  <div class="editor-container">
    <textarea
        v-model="markdownText"
        class="markdown-editor"
        placeholder="Write your markdown here..."
        @paste="handlePaste"
    ></textarea>
    <div class="markdown-preview" v-html="htmlContent"></div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue';
import MarkdownIt from 'markdown-it';

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const url = await uploadImage(file);
        insertImageMarkdown(url);
      }
    }
  }
};

const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:18082/api/v1/images/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data.url;
};

const insertImageMarkdown = (url: string) => {
  const markdownImage = `![alt text](${url})`;
  markdownText.value += `\n${markdownImage}\n`;
};

const markdownText = ref('');
const md = new MarkdownIt();

const htmlContent = computed(() => {
  return md.render(markdownText.value);
});
</script>

<style scoped>
textarea {
  width: 100%;
  height: 300px;
  padding: 10px;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
}

.editor-container {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.markdown-editor {
  width: 50%;
  height: 400px;
  padding: 10px;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
}

.markdown-preview {
  width: 50%;
  height: 400px;
  padding: 10px;
  font-family: 'Arial', sans-serif;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow-y: auto;
  background-color: #f7f7f7;
}
</style>
