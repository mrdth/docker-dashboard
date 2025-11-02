<template>
    <div v-if="displayLogs.length === 0" class="text-center py-6 text-gray-500">
        <p>No logs available</p>
    </div>
    <div
        v-else
        class="bg-gray-900 rounded p-4 font-mono text-sm text-gray-100 max-h-96 overflow-y-auto"
    >
        <div
            v-for="(log, index) in displayLogs"
            :key="index"
            class="flex gap-4 py-1 hover:bg-gray-800 transition-colors"
        >
            <span class="text-gray-500 flex-shrink-0">{{ log.timestamp }}</span>
            <span class="text-gray-100 flex-1 break-words">
                {{ log.message }}
            </span>
            <span
                v-if="log.stream"
                class="text-xs text-gray-500 flex-shrink-0 uppercase"
            >
                {{ log.stream }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { LogEntry } from "../types/index";

interface Props {
    logs: LogEntry[];
}

const props = defineProps<Props>();

/**
 * Display all log lines
 */
const displayLogs = computed(() => {
    return props.logs;
});
</script>

<style scoped>
/* Scrollbar styling */
::-webkit-scrollbar {
    width: 6px;
}

::-webkit-scrollbar-track {
    background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: #5a6672;
}
</style>
