<template>
  <div class="flex flex-col items-center justify-center py-12 px-4">
    <!-- Container Icon -->
    <div class="mb-4">
      <svg
        class="w-16 h-16 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        ></path>
      </svg>
    </div>

    <!-- Message -->
    <h3 class="text-lg font-semibold text-gray-900 mb-2">No containers</h3>
    <p class="text-gray-500 text-center max-w-sm">
      No Docker containers are currently running or available on this host.
    </p>
  </div>
</template>

<script setup lang="ts">
// T069: ContainerEmptyState component
// Shows a message when no containers are available
</script>
