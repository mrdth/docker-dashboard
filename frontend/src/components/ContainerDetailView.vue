<template>
    <div class="space-y-6">
        <!-- Container Header -->
        <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-start justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">
                        {{ container.name }}
                    </h2>
                    <p class="text-sm text-gray-500 mt-1">
                        {{ container.id }}
                    </p>
                </div>
                <ContainerStatusBadge :status="container.status" />
            </div>

            <div class="grid grid-cols-2 gap-4 mt-6 text-sm">
                <div>
                    <p class="text-gray-500">Image</p>
                    <p class="font-mono text-gray-900">{{ container.image }}</p>
                </div>
                <div>
                    <p class="text-gray-500">Created</p>
                    <p class="text-gray-900">{{ formatDate(container.created) }}</p>
                </div>
                <div v-if="container.started">
                    <p class="text-gray-500">Started</p>
                    <p class="text-gray-900">{{ formatDate(container.started) }}</p>
                </div>
            </div>
        </div>

        <!-- T091: Metrics Section -->
        <div v-if="container.metrics" class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Metrics</h3>

            <div class="grid grid-cols-2 gap-6">
                <!-- CPU Metrics -->
                <div>
                    <p class="text-sm text-gray-500 mb-2">CPU Usage</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-3xl font-bold text-gray-900">
                            {{ container.metrics.cpu.percentage }}%
                        </span>
                        <span class="text-sm text-gray-500">
                            ({{ container.metrics.cpu.cores }} cores)
                        </span>
                    </div>
                    <div
                        class="w-full h-2 bg-gray-200 rounded mt-3 overflow-hidden"
                    >
                        <div
                            class="h-full bg-blue-500 transition-all"
                            :style="{
                                width:
                                    Math.min(
                                        container.metrics.cpu.percentage,
                                        100,
                                    ) + '%',
                            }"
                        />
                    </div>
                </div>

                <!-- Memory Metrics -->
                <div>
                    <p class="text-sm text-gray-500 mb-2">Memory Usage</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-3xl font-bold text-gray-900">
                            {{ container.metrics.memory.percentage }}%
                        </span>
                        <span class="text-sm text-gray-500">
                            ({{ formatBytes(container.metrics.memory.usage) }}/{{
                                formatBytes(container.metrics.memory.limit)
                            }})
                        </span>
                    </div>
                    <div
                        class="w-full h-2 bg-gray-200 rounded mt-3 overflow-hidden"
                    >
                        <div
                            class="h-full bg-purple-500 transition-all"
                            :style="{
                                width:
                                    container.metrics.memory.percentage + '%',
                            }"
                        />
                    </div>
                </div>

                <!-- Disk I/O Metrics -->
                <div>
                    <p class="text-sm text-gray-500 mb-2">Disk I/O</p>
                    <div class="space-y-1 text-sm">
                        <p class="text-gray-900">
                            <span class="font-medium">Read:</span>
                            {{ formatBytes(container.metrics.diskIo.readBytes) }}
                            ({{
                                formatBytes(
                                    container.metrics.diskIo.readBytesPerSec,
                                )
                            }}/s)
                        </p>
                        <p class="text-gray-900">
                            <span class="font-medium">Write:</span>
                            {{
                                formatBytes(container.metrics.diskIo.writeBytes)
                            }}
                            ({{
                                formatBytes(
                                    container.metrics.diskIo.writeBytesPerSec,
                                )
                            }}/s)
                        </p>
                    </div>
                </div>

                <!-- Network I/O Metrics -->
                <div>
                    <p class="text-sm text-gray-500 mb-2">Network I/O</p>
                    <div class="space-y-1 text-sm">
                        <p class="text-gray-900">
                            <span class="font-medium">Received:</span>
                            {{
                                formatBytes(
                                    container.metrics.networkIo.receivedBytes,
                                )
                            }}
                            ({{
                                formatBytes(
                                    container.metrics.networkIo
                                        .receivedBytesPerSec,
                                )
                            }}/s)
                        </p>
                        <p class="text-gray-900">
                            <span class="font-medium">Sent:</span>
                            {{ formatBytes(container.metrics.networkIo.sentBytes) }}
                            ({{
                                formatBytes(
                                    container.metrics.networkIo.sentBytesPerSec,
                                )
                            }}/s)
                        </p>
                    </div>
                </div>
            </div>

            <!-- Metrics unavailable state -->
            <div
                v-if="container.metrics.status === 'unavailable'"
                class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800"
            >
                ⚠️ Metrics are temporarily unavailable. Retrying...
            </div>
        </div>

        <!-- T091: Ports Section -->
        <div
            v-if="container.ports && container.ports.length > 0"
            class="bg-white rounded-lg shadow p-6"
        >
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Port Mappings</h3>
            <PortsList :ports="container.ports" />
        </div>

        <!-- T091: Logs Section -->
        <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Logs</h3>
            <LogsViewer :logs="container.logs || []" />
        </div>
    </div>
</template>

<script setup lang="ts">
import ContainerStatusBadge from "./ContainerStatusBadge.vue";
import PortsList from "./PortsList.vue";
import LogsViewer from "./LogsViewer.vue";
import type { Container } from "../types/index";

interface Props {
    container: Container;
}

defineProps<Props>();

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp: number | string): string {
    const ts =
        typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
    const date = new Date(ts * 1000);
    return date.toLocaleString();
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}
</script>
