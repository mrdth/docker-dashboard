<template>
  <div v-if="visible" class="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-3 shadow-lg z-50">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <p class="font-semibold">{{ title }}</p>
          <p class="text-sm opacity-90">{{ message }}</p>
        </div>
      </div>
      <button
        @click="visible = false"
        class="text-white hover:opacity-75 transition-opacity"
      >
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  message?: string;
  title?: string;
  autoDismissMs?: number;
}

const props = withDefaults(defineProps<Props>(), {
  message: 'An error occurred',
  title: 'Error',
  autoDismissMs: 5000
});

const visible = ref(false);
let dismissTimeout: number | undefined;

const show = (): void => {
  visible.value = true;

  if (dismissTimeout !== undefined) {
    clearTimeout(dismissTimeout);
  }

  if (props.autoDismissMs > 0) {
    dismissTimeout = window.setTimeout(() => {
      visible.value = false;
    }, props.autoDismissMs);
  }
};

const hide = (): void => {
  visible.value = false;
  if (dismissTimeout !== undefined) {
    clearTimeout(dismissTimeout);
  }
};

const reset = (): void => {
  visible.value = false;
  if (dismissTimeout !== undefined) {
    clearTimeout(dismissTimeout);
  }
};

watch(
  () => props.message,
  () => {
    show();
  },
  { immediate: true }
);

defineExpose({
  show,
  hide,
  reset,
  visible
});
</script>

<style scoped>
div {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
