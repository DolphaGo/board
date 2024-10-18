<template>
  <div id="layout">
    <Header />
    <div class="container">
      <Sidebar />
      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Header from './Header.vue';
import Sidebar from './Sidebar.vue';
</script>

<style>
#layout {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  background-color: #f4f4f9;
  margin-top: 60px;
}

.container {
  display: flex;
  max-width: 1200px;
  margin: 20px auto;
}

.content {
  flex: 1;
  padding: 20px;
}
</style>
