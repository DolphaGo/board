<template>
  <div>
    <h1>게시판</h1>
    <ul>
      <li v-for="post in posts" :key="post.id">
        {{ post.title }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const posts = ref([
  { id: 1, title: '첫 번째 게시글' },
  { id: 2, title: '두 번째 게시글' }
]);
</script>
