<template>
  <RouterView v-slot="{ Component }">
    <suspense>
      <template #default>
        <component :is="Component || 'div'" />
      </template>
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
