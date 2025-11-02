<template>
    <div class="min-h-screen bg-gray-50">
        <!-- Header with back button -->
        <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 pb-4">
                        {{ containerName }}
                    </h1>
                    <button
                        @click="goBack"
                        class="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                    >
                        ← Back to Containers
                    </button>
                </div>
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

            <!-- Container Detail View -->
            <div v-else-if="container">
                <ContainerDetailView :container="container" />
            </div>

            <!-- Not Found State -->
            <div v-else class="bg-white rounded-lg shadow p-8 text-center">
                <p class="text-gray-600 mb-4">Container not found</p>
                <button
                    @click="goBack"
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                    Back to Containers
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { get } from "../services/api";
import ContainerDetailView from "../components/ContainerDetailView.vue";
import ErrorBanner from "../components/ErrorBanner.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import type { Container } from "../types/index";

interface Props {
    id: string;
}

const props = defineProps<Props>();
const router = useRouter();

const container = ref<Container | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

/**
 * T114: Fetch container detail on page load
 */
async function fetchContainerDetail(): Promise<void> {
    if (!props.id) {
        error.value = "No container ID provided";
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        const response = await get<{ container: Container }>(
            `/api/containers/${props.id}`,
        );

        if (response?.container) {
            container.value = response.container;
        } else {
            error.value = "Failed to load container details";
        }
    } catch (err) {
        error.value =
            err instanceof Error
                ? err.message
                : "Failed to fetch container details";
        console.error("Failed to fetch container detail:", err);
    } finally {
        loading.value = false;
    }
}

/**
 * Container name for header
 */
const containerName = computed(() => {
    if (container.value) {
        return container.value.name || container.value.id;
    }
    return "Loading...";
});

/**
 * Navigate back to dashboard
 */
function goBack(): void {
    router.push("/");
}

/**
 * Initialize on component mount
 */
onMounted(() => {
    fetchContainerDetail();
});
</script>
