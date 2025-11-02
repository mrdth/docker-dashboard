<template>
    <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex flex-col gap-4 md:flex-row md:gap-4 md:items-end">
            <!-- Search Input -->
            <div class="flex-1">
                <label
                    for="name-search"
                    class="block text-sm font-medium text-gray-700 mb-2"
                >
                    Search by Name
                </label>
                <input
                    id="name-search"
                    :value="filters.name"
                    type="text"
                    placeholder="Filter by container name..."
                    @input="handleNameChange"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <!-- Status Filter Dropdown -->
            <div class="md:w-48">
                <label
                    for="status-filter"
                    class="block text-sm font-medium text-gray-700 mb-2"
                >
                    Filter by Status
                </label>
                <select
                    id="status-filter"
                    :value="filters.status"
                    @change="handleStatusChange"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">All Statuses</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                    <option value="paused">Paused</option>
                    <option value="exited">Exited</option>
                </select>
            </div>

            <!-- Clear Filters Button -->
            <button
                @click="clearFilters"
                :disabled="!hasActiveFilters"
                class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
                Clear Filters
            </button>
        </div>

        <!-- Active Filters Display -->
        <div v-if="hasActiveFilters" class="mt-4 flex flex-wrap gap-2">
            <span class="text-sm text-gray-600">Active filters:</span>
            <span
                v-if="filters.name"
                class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
            >
                Name: {{ filters.name }}
            </span>
            <span
                v-if="filters.status"
                class="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
            >
                Status: {{ filters.status }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

/**
 * T123: ContainerFilters component
 * Provides search and status filtering UI
 */

interface Filters {
    name: string;
    status: string;
}

const filters = ref<Filters>({
    name: "",
    status: "",
});

const emit = defineEmits<{
    "update:filters": [filters: Filters];
}>();

const hasActiveFilters = computed(() => {
    return filters.value.name !== "" || filters.value.status !== "";
});

/**
 * T126: Handle search input with debounce
 * Waits 300ms after user stops typing before emitting
 */
let debounceTimer: NodeJS.Timeout | null = null;

function handleNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    filters.value.name = input.value;

    // Clear previous timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    // Set new debounce timer (300ms wait)
    debounceTimer = setTimeout(() => {
        emit("update:filters", filters.value);
    }, 300);
}

function handleStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    filters.value.status = select.value;

    // Emit immediately on status change (no debounce needed for select)
    emit("update:filters", filters.value);
}

/**
 * T127: Clear filters button
 * Resets all filters and emits update
 */
function clearFilters(): void {
    filters.value = {
        name: "",
        status: "",
    };

    // Clear any pending debounce timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    emit("update:filters", filters.value);
}
</script>
