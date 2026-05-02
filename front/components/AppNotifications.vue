<script setup lang="ts">
const { $notifications } = useNuxtApp();
</script>

<template>
  <div class="notifications" aria-live="polite">
    <div
      v-for="message in $notifications.value"
      :key="message.id"
      class="notification"
      :class="`is-${message.type}`"
    >
      {{ message.text }}
    </div>
  </div>
</template>

<style scoped>
.notifications {
  display: grid;
  gap: 0.5rem;
  position: fixed;
  right: 1rem;
  top: 4.5rem;
  z-index: 50;
}

.notification {
  background: #26384f;
  border-radius: 6px;
  color: #ffffff;
  max-width: 320px;
  padding: 0.75rem 1rem;
}

.notification.is-success {
  background: #19723a;
}

.notification.is-error {
  background: #b3261e;
}
</style>
