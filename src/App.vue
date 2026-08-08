<template>
  <OfflineBanner />
  <AppHeader />
  <main>
    <router-view />
  </main>
  <UpdatePrompt />

  <!-- comando para rodar o projeto no docker: -->
<!--docker run -p 8001:8001 eduardosilvasc/gerenciamento-tarefas-2026:3.0 -->
<!-- http://localhost:8001/docs -->
  
</template>

<script setup>
import AppHeader from './components/AppHeader.vue';
import OfflineBanner from './components/OfflineBanner.vue';
import UpdatePrompt from './components/UpdatePrompt.vue';
</script>

<style scoped>
main {
  padding-bottom: 40px;
}
</style>