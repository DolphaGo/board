<template>
  <header class="header">
    <div class="logo">DolphaGo's Blog</div>
    <nav>
      <a href="#">Home</a>
      <a href="#">Posts</a>
      <a href="#">About</a>
    </nav>
  </header>
</template>

<script lang="ts" setup>
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

.logo {
  font-weight: bold;
  font-size: 24px;
}

nav a {
  margin-left: 15px;
  text-decoration: none;
  color: #333;
}
</style>
