<template>
  <header class="header">
    <div class="logo">DolphaGo's Blog</div>
    <form class="header-search" role="search" @submit.prevent="submitSearch">
      <input
        v-model="keyword"
        class="header-search-input"
        type="search"
        placeholder="게시글 검색"
        aria-label="게시글 검색"
      >
      <button type="submit" class="header-search-button">검색</button>
    </form>
    <nav>
      <router-link to="/" data-nav="home">Home</router-link>
      <router-link to="/" data-nav="posts">Posts</router-link>
      <router-link to="/post/edit">글쓰기</router-link>
      <router-link to="/chat/rooms">Chat</router-link>
      <router-link to="/admin/hidden-posts">숨김 관리</router-link>
    </nav>
  </header>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { createHeaderSearch } from './useHeaderSearch'

const router = useRouter()
const { keyword, submitSearch } = createHeaderSearch({
  onSearch: searchKeyword => router.push({
    path: '/search',
    query: {
      keyword: searchKeyword,
    },
  }),
})
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  width: 100%;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
}

.header-search {
  display: flex;
  align-items: center;
  gap: 6px;
  width: min(360px, 36vw);
}

.header-search-input {
  min-width: 0;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #bdbdbd;
  font-size: 13px;
}

.header-search-button {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid #1a1a1a;
  background: #ffffff;
  color: #1a1a1a;
  font-size: 13px;
  cursor: pointer;
}

.logo {
  font-weight: bold;
  font-size: 24px;
}

nav a {
  margin-left: 15px;
  text-decoration: none;
  color: #333;
}

@media (max-width: 720px) {
  .header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-search {
    order: 3;
    width: 100%;
  }
}
</style>
