<template>
  <RouterView v-slot="{ Component }">
    <suspense>
      <component :is="Component" />
    </suspense>
  </RouterView>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'App',
  components: {
  },
})
</script>

<style>
</style>
