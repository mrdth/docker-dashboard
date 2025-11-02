<script setup lang="ts">
import { ref } from 'vue'
import ErrorBanner from './components/ErrorBanner.vue'
import LoadingSpinner from './components/LoadingSpinner.vue'

const errorBannerRef = ref<InstanceType<typeof ErrorBanner>>()
const isLoading = ref(false)
</script>

<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Error Banner -->
    <ErrorBanner
      ref="errorBannerRef"
      title="Error"
      message=""
      :auto-dismiss-ms="5000"
    />

    <!-- Header -->
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 class="text-2xl font-bold text-gray-900">
          Docker Container Metrics Dashboard
        </h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div v-if="isLoading" class="flex justify-center py-12">
        <LoadingSpinner text="Loading containers..." />
      </div>
      <div v-else>
        <!-- Placeholder for content -->
        <div class="bg-white rounded-lg shadow p-6">
          <p class="text-gray-600">
            Application initialized. More components coming in Phase 3.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
}
</style>
