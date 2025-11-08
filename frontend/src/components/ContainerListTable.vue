<template>
    <div class="overflow-x-auto">
        <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th class="px-6 py-3 text-left font-semibold text-gray-900">
                        Container
                    </th>
                    <th
                        class="px-6 py-3 text-center font-semibold text-gray-900"
                    >
                        Status
                    </th>
                    <th class="px-6 py-3 text-left font-semibold text-gray-900">
                        Created
                    </th>
                    <th class="px-6 py-3 text-left font-semibold text-gray-900">
                        Image
                    </th>
                    <!-- T089: Add metrics columns -->
                    <th
                        class="px-6 py-3 text-center font-semibold text-gray-900"
                    >
                        CPU %
                    </th>
                    <th
                        class="px-6 py-3 text-center font-semibold text-gray-900"
                    >
                        MEM %
                    </th>
                    <th
                        class="px-6 py-3 text-center font-semibold text-gray-900"
                    >
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="container in containers"
                    :key="container.id"
                    class="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    <td class="px-6 py-4">
                        <div class="flex items-center">
                        <UpdateIndicator :image-info="container.imageInfo" />
                        <div class="font-medium text-gray-900 pl-2">
                            {{ container.name }}
                            <code
                                class="text-xs bg-gray-100 px-2 py-1 mt-2 rounded text-gray-700"
                            >
                                {{ container.id.substring(0, 12) }}
                            </code>
                        </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <ContainerStatusBadge :status="container.status" />
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-gray-600">
                            {{ formatDate(container.created) }}
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div
                            class="text-gray-600 truncate max-w-xs"
                            :title="container.image"
                        >
                            {{ container.image }}
                        </div>
                    </td>
                    <!-- T089: Display metrics with MetricsCell component -->
                    <td class="px-6 py-4">
                        <MetricsCell
                            v-if="container.metrics"
                            :value="container.metrics.cpu.percentage"
                            type="cpu"
                        />
                        <div v-else class="text-gray-400 text-sm">N/A</div>
                    </td>
                    <td class="px-6 py-4">
                        <MetricsCell
                            v-if="container.metrics"
                            :value="container.metrics.memory.percentage"
                            type="memory"
                        />
                        <div v-else class="text-gray-400 text-sm">N/A</div>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <router-link
                            :to="`/containers/${container.id}`"
                            class="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors inline-block"
                        >
                            Details
                        </router-link>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import ContainerStatusBadge from "./ContainerStatusBadge.vue";
import MetricsCell from "./MetricsCell.vue";
import UpdateIndicator from "./UpdateIndicator.vue";
import type { Container } from "../types/index";

interface Props {
    containers: Container[];
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
</script>
