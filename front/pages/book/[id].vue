<script setup lang="ts">
definePageMeta({ name: 'book' });

const route = useRoute();
</script>

<template>
  <div>Book page (Nuxt migration scaffold): {{ route.params.id }}</div>
</template>
