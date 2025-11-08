<template>
    <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h1 class="text-3xl font-bold text-gray-900">
                    Docker Containers
                </h1>
                <p class="mt-2 text-gray-600">
                    Monitor and manage your Docker containers in real-time
                </p>
            </div>
        </div>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Error Banner -->
            <ErrorBanner
                v-if="error"
                :message="error"
                @dismiss="error = null"
            />

            <!-- Loading State -->
            <LoadingSpinner v-if="loading" />

            <!-- Filters Section -->
            <ContainerFilters
                v-if="!loading"
                :model-value="filters"
                @update:filters="filters = $event"
            />

            <!-- Container List or Empty State -->
            <div v-if="!loading" class="bg-white rounded-lg shadow">
                <ContainerEmptyState v-if="filteredContainers.length === 0" />
                <ContainerListTable v-else :containers="filteredContainers" />
            </div>

            <!-- Last Updated -->
            <div
                v-if="lastUpdated && !loading"
                class="mt-4 text-sm text-gray-600"
            >
                Last updated: {{ formatTime(lastUpdated!) }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";
import { useContainers } from "../composables/useContainers";
import ContainerListTable from "../components/ContainerListTable.vue";
import ContainerEmptyState from "../components/ContainerEmptyState.vue";
import ContainerFilters from "../components/ContainerFilters.vue";
import ErrorBanner from "../components/ErrorBanner.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";

/**
 * T065: Dashboard page component
 * Displays container list with real-time updates and filtering
 */
const {
    filteredContainers,
    filters,
    loading,
    error: composableError,
    lastUpdated,
} = useContainers();
const error = ref<string | null>(null);

// Watch for composable errors
if (composableError) {
    error.value = composableError.value;
}

/**
 * Format timestamp to readable time
 */
function formatTime(date: Date | null): string {
    if (!date) return "";
    if (!(date instanceof Date)) return "";
    return date.toLocaleTimeString();
}

/**
 * Error boundary for the dashboard
 */
onErrorCaptured((err) => {
    error.value = "An unexpected error occurred. Please refresh the page.";
    console.error("Dashboard error:", err);
    return false; // Prevent error propagation
});
</script>
