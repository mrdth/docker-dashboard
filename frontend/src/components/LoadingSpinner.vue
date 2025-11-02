<template>
  <div class="flex items-center justify-center gap-3">
    <div class="relative w-8 h-8">
      <div
        class="absolute inset-0 border-4 border-gray-200 rounded-full"
      ></div>
      <div
        class="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
      ></div>
    </div>
    <span v-if="text" class="text-gray-600">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  text?: string;
}

withDefaults(defineProps<Props>(), {
  text: ''
});
</script>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
