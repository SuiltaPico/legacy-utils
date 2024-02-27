<script setup lang="ts">
import { ref } from "vue";
import { routes } from "../router/";

const loading = ref(false)
</script>

<template lang="pug">
q-page.row.justify-center.text-left
  q-list.col-6(bordered separator)
    q-item(
      v-for="route in routes.filter(r => r.name !== $route.name)" 
      clickable @click="(loading = true) && $router.push({ name: route.name })"
    )
      q-item-section {{ route.name }}
  
  q-inner-loading(:showing="loading" label="正在跳转...")
</template>