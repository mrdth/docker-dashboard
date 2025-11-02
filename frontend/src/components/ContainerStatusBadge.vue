<template>
  <span :class="badgeClasses" class="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
    {{ statusLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  status: 'running' | 'stopped' | 'paused' | 'exited' | 'created' | 'restarting';
}

const props = defineProps<Props>();

/**
 * T068: Status badge color mapping
 * Green (running), gray (stopped), yellow (paused), red (exited)
 */
const badgeClasses = computed(() => {
  const baseClasses = 'inline-block';

  switch (props.status) {
    case 'running':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'stopped':
      return `${baseClasses} bg-gray-100 text-gray-800`;
    case 'exited':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'paused':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'created':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'restarting':
      return `${baseClasses} bg-orange-100 text-orange-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
});

/**
 * Status label for display
 */
const statusLabel = computed(() => {
  return props.status.charAt(0).toUpperCase() + props.status.slice(1);
});
</script>
