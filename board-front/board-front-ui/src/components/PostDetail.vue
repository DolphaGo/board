<template>
  <div>
    <p v-if="loading">게시글을 불러오는 중...</p>
    <p v-else-if="error">게시글을 불러오지 못했습니다.</p>
    <article v-else-if="post">
      <h1>{{ post.title }}</h1>
      <p>{{ post.content }}</p>
      <p class="post-meta">조회수 {{ post.viewCount }}</p>
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
</script>

<style scoped>
.post-meta {
  color: #777777;
  font-size: 13px;
}
</style>
