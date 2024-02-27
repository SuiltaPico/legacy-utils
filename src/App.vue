<script setup lang="ts">
</script>

<template lang="pug">
q-layout(view="hHh lpR fFf")
  q-page-container
    router-view
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /*text-align: center;*/
  color: #2c3e50;
  margin-top: 60px;
}

html,
body,
#app {
  height: 100%;
  width: 100%;
}
</style>
