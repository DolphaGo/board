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
@import url('https://knit.navercorp.com/libs/knit/2.0.0/css/knit.min.css');
</style>
