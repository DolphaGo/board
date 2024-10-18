<template>
  <aside class="sidebar">
    <h3>Categories</h3>
    <ul>
      <li><a href="#">Tech</a></li>
      <li><a href="#">Life</a></li>
      <li><a href="#">Art</a></li>
    </ul>
  </aside>
</template>

<script lang="ts" setup>
</script>

<style scoped>
.sidebar {
  width: 200px;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar li {
  margin-bottom: 10px;
}

.sidebar a {
  text-decoration: none;
  color: #333;
}
</style>
