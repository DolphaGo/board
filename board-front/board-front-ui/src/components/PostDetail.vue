<template>
  <div>
    <h1>{{ post.title }}</h1>
    <p>{{ post.content }}</p>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const post = ref({
  title: '첫 번째 게시글',
  content: '여기는 첫 번째 게시글의 내용입니다.'
});
</script>
