<template>
    <div v-if="imageInfo" class="flex items-center gap-2">
        <!-- T140-T141: Update available badge -->
        <div
            v-if="imageInfo.registryStatus === 'checked'"
            class="relative group"
        >
            <div
                v-if="imageInfo.updateAvailable"
                class="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-red-200 rounded text-xs font-medium hover:bg-red-800 transition-colors cursor-help"
            >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                    />
                </svg>

            </div>

            <!-- Up to date indicator -->
            <div
                v-else
                class="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-green-200 rounded text-xs font-medium"
            >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                    />
                </svg>

            </div>

            <!-- Tooltip showing latest version -->
            <div
                class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-gray-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
            >
                <span v-if="imageInfo.updateAvailable">Update<br/>Available</span>
                <span v-else>Up to date</span>
                <div
                    class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"
                />
            </div>
        </div>

        <!-- Unable to check (private registry) -->
        <div
            v-else-if="imageInfo.registryStatus === 'unable_to_check'"
            class="relative group"
        >
            <div
                class="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-medium hover:bg-gray-600 transition-colors cursor-help"
            >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                    />
                </svg>

            </div>

            <!-- Tooltip for private registry -->
            <div
                class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-gray-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
            >
                Private registry - manual update check required
                <div
                    class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ImageInfo } from "../types/index";

interface Props {
    imageInfo?: ImageInfo;
}

defineProps<Props>();
</script>

<style scoped>
/* Smooth transitions for tooltips and states */
.group:hover .group-hover\:opacity-100 {
    animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translate(-50%, 0);
    }
    to {
        opacity: 1;
        transform: translate(-50%, 0);
    }
}
</style>
