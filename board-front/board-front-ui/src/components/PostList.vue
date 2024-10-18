<template>
  <div class="post-list">
    <h2>Recent Posts</h2>
    <div v-for="post in posts" :key="post.id" class="post">
      <h3>{{ post.title }}</h3>
      <p>{{ post.body }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
const posts = [
  { id: 1, title: 'First Post', body: 'This is the first post.' },
  { id: 2, title: 'Second Post', body: 'This is the second post.' },
  { id: 3, title: 'Third Post', body: 'This is the third post.' },
];
</script>

<style scoped>
.post-list {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.post {
  margin-bottom: 20px;
}

.post h3 {
  margin: 0;
}

.post p {
  color: #666;
}
</style>
