<template>
    <div v-if="ports.length === 0" class="text-center py-6 text-gray-500">
        <p>No ports exposed</p>
    </div>
    <div v-else class="space-y-2">
        <div
            v-for="(port, index) in ports"
            :key="index"
            class="flex items-center justify-between p-3 bg-gray-50 rounded"
        >
            <code class="text-sm font-mono text-gray-900">
                {{ formatPort(port) }}
            </code>
            <span class="text-xs text-gray-500 uppercase">{{ port.protocol }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Port } from "../types/index";

interface Props {
    ports: Port[];
}

defineProps<Props>();

/**
 * Format port mapping as "hostPort:containerPort/protocol"
 */
function formatPort(port: Port): string {
    if (port.hostPort) {
        return `${port.hostPort}:${port.containerPort}/${port.protocol}`;
    }
    return `${port.containerPort}/${port.protocol}`;
}
</script>
