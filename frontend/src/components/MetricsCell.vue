<template>
    <div class="flex flex-col items-center gap-2">
        <!-- T090: Display percentage with color coding and responsive font scaling -->
        <div
            class="px-2 py-1 rounded font-mono text-sm relative"
            :class="metricsClass"
            :title="tooltipText"
        >
            <!-- Handle large values with abbreviated notation if needed -->
            <span v-if="displayValue > 999">{{ abbreviatedValue }}</span>
            <span v-else>{{ displayValue }}%</span>
            <!-- T151: Stale indicator for metrics older than 30 seconds -->
            <span
                v-if="isStale"
                class="ml-1 text-xs opacity-75"
                title="Metric data is stale (>30 seconds old)"
            >
                🔄
            </span>
        </div>
        <!-- Visual progress indicator -->
        <div class="w-16 h-2 bg-gray-200 rounded overflow-hidden">
            <div
                class="h-full transition-all"
                :class="barClass"
                :style="{ width: progressBarWidth }"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
    value: number; // The percentage value (0-100 for memory, 0+ for CPU)
    type: "cpu" | "memory"; // Type of metric
    lastUpdated?: Date; // T151: Optional timestamp for stale indicator
}

const props = withDefaults(defineProps<Props>(), {
    lastUpdated: undefined,
});

/**
 * T090: Calculate display value and styling based on metric percentage
 * CPU can exceed 100% on multi-core systems
 * Memory is capped at 100%
 */
const displayValue = computed(() => {
    // Round to 1 decimal place
    return Math.round(props.value * 10) / 10;
});

/**
 * Abbreviate very large CPU values (>999%)
 */
const abbreviatedValue = computed(() => {
    if (displayValue.value >= 1000) {
        return (displayValue.value / 1000).toFixed(1) + "K%";
    }
    return displayValue.value + "%";
});

/**
 * T090: Calculate color based on resource usage
 * Green (<50%), Yellow (50-80%), Red (>80%)
 */
const metricsClass = computed(() => {
    if (props.value < 50) {
        return "bg-green-100 text-green-900";
    } else if (props.value < 80) {
        return "bg-yellow-100 text-yellow-900";
    } else {
        return "bg-red-100 text-red-900";
    }
});

/**
 * Progress bar class based on usage level
 */
const barClass = computed(() => {
    if (props.value < 50) {
        return "bg-green-500";
    } else if (props.value < 80) {
        return "bg-yellow-500";
    } else {
        return "bg-red-500";
    }
});

/**
 * Calculate progress bar width
 * For CPU: cap at 100% visually, but show actual value
 * For memory: always 0-100%
 */
const progressBarWidth = computed(() => {
    const percentage = Math.min(props.value, 100);
    return `${percentage}%`;
});

/**
 * T090: Tooltip text showing detailed breakdown
 */
const tooltipText = computed(() => {
    if (props.type === "cpu") {
        // For CPU on multi-core systems
        const cores = Math.round(props.value / 100);
        const coresText =
            cores > 1
                ? `${cores} cores busy`
                : cores === 1
                  ? "1 core busy"
                  : "idle";
        return `CPU: ${displayValue.value}% (${coresText})`;
    } else {
        // For memory
        return `Memory: ${displayValue.value}%`;
    }
});

/**
 * T151: Check if metric is stale (older than 30 seconds)
 */
const isStale = computed(() => {
    if (!props.lastUpdated) {
        return false;
    }

    const now = new Date().getTime();
    const lastUpdate = new Date(props.lastUpdated).getTime();
    const ageInSeconds = (now - lastUpdate) / 1000;

    return ageInSeconds > 30;
});
</script>

<style scoped>
/* T092: Smooth metric update animations */
.px-2.py-1 {
    transition:
        background-color 0.3s ease,
        color 0.3s ease;
}

.h-full {
    transition:
        width 0.4s ease-in-out,
        background-color 0.3s ease;
}

/* Responsive font scaling for large values */
@media (max-width: 768px) {
    :deep() .px-2.py-1 {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
    }
}
</style>
