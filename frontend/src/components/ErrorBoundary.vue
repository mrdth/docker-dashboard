<template>
    <div v-if="hasError" class="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center gap-3 mb-4">
            <span class="text-2xl">⚠️</span>
            <h2 class="text-lg font-semibold text-red-900">
                Something went wrong
            </h2>
        </div>
        <p class="text-red-700 mb-4">{{ errorMessage }}</p>
        <button
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            @click="handleRetry"
        >
            Try Again
        </button>
    </div>
    <div v-else>
        <slot />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onErrorCaptured } from "vue";

const hasError = ref(false);
const errorMessage = ref<string>("");

/**
 * T150: Vue 3 error boundary using onErrorCaptured
 * Catches component rendering errors and displays error message with retry option
 */
onErrorCaptured((error: unknown) => {
    hasError.value = true;
    errorMessage.value =
        error instanceof Error
            ? error.message
            : "An unexpected error occurred";

    // Log error for debugging
    console.error("Error boundary caught:", error);

    // Return false to prevent error from propagating
    return false;
});

/**
 * Handle retry button click
 * Clears error state and re-renders child components
 */
function handleRetry(): void {
    hasError.value = false;
    errorMessage.value = "";

    // Force re-render by triggering onMounted again
    setTimeout(() => {
        // Trigger a re-render if needed
        window.location.reload();
    }, 100);
}

onMounted(() => {
    // Initialize error state
    hasError.value = false;
    errorMessage.value = "";
});
</script>

<style scoped>
/* Error boundary styling */
button {
    font-weight: 500;
}

button:active {
    transform: scale(0.98);
}
</style>
