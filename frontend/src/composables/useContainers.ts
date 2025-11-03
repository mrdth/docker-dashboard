/**
 * useContainers composable
 * Manages container list state, REST fetches, and WebSocket updates
 */

import { ref, onMounted, Ref, computed } from "vue";
import { get } from "../services/api";
import { getWebSocketConnection } from "../services/websocket";
import type { Container, WebSocketMessage } from "../types/index";

interface Filters {
    name: string;
    status: string;
}

interface UseContainersState {
    containers: Ref<Container[]>;
    filteredContainers: Ref<Container[]>;
    filters: Ref<Filters>;
    loading: Ref<boolean>;
    error: Ref<string | null>;
    lastUpdated: Ref<Date | null>;
}

// T157: Cache configuration for container list
const CACHE_TTL_MS = 30000; // 30 seconds
let cachedContainers: Container[] | null = null;
let lastCacheTime: number | null = null;

export function useContainers(): UseContainersState & {
    fetchContainers: () => Promise<void>;
} {
    const containers = ref<Container[]>([]);
    const filters = ref<Filters>({
        name: "",
        status: "",
    });
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastUpdated = ref<Date | null>(null);

    const ws = getWebSocketConnection();

    /**
     * T124: Computed filtered containers based on filters
     * Applies name (substring, case-insensitive) and status filters
     */
    const filteredContainers = computed(() => {
        return containers.value.filter((container) => {
            // Filter by name (case-insensitive substring match)
            if (
                filters.value.name &&
                !container.name
                    .toLowerCase()
                    .includes(filters.value.name.toLowerCase())
            ) {
                return false;
            }

            // Filter by status (exact match)
            if (
                filters.value.status &&
                container.status !== filters.value.status
            ) {
                return false;
            }

            return true;
        });
    });

    /**
     * T066: Fetch containers from REST API with metrics
     * T157: Use cache with 30s TTL to reduce REST calls
     */
    async function fetchContainers(): Promise<void> {
        loading.value = true;
        error.value = null;

        try {
            // T157: Check cache first
            const now = Date.now();
            if (
                cachedContainers &&
                lastCacheTime &&
                now - lastCacheTime < CACHE_TTL_MS
            ) {
                // Use cached data
                containers.value = cachedContainers;
                lastUpdated.value = new Date();
                loading.value = false;
                return;
            }

            const response = await get<{
                containers: Container[];
                error: null;
            }>("/api/containers");

            if (response && response.containers) {
                // For each container, fetch its detail to get metrics
                const containersWithMetrics = await Promise.all(
                    response.containers.map(async (container) => {
                        try {
                            const detailResponse = await get<{
                                container: Container;
                            }>(`/api/containers/${container.id}`);

                            if (detailResponse?.container) {
                                return detailResponse.container;
                            }
                            return container;
                        } catch (err) {
                            // If detail fetch fails, return container without metrics
                            console.warn(
                                `Failed to fetch metrics for container ${container.id}`,
                                err,
                            );
                            return container;
                        }
                    }),
                );

                containers.value = containersWithMetrics;
                lastUpdated.value = new Date();

                // T157: Update cache
                cachedContainers = containersWithMetrics;
                lastCacheTime = Date.now();
            }
        } catch (err) {
            error.value =
                err instanceof Error
                    ? err.message
                    : "Failed to fetch containers";
            console.error("Failed to fetch containers:", err);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Handle WebSocket container_status_changed message
     */
    function handleStatusChanged(message: any): void {
        const { containerId, status } = message.data;

        const containerIndex = containers.value.findIndex(
            (c) => c.id === containerId,
        );
        if (containerIndex >= 0) {
            containers.value[containerIndex].status = status;
        }
    }

    /**
     * Handle WebSocket container_list message
     * Merge new container data without overwriting existing metrics and imageInfo
     */
    function handleContainerListUpdate(message: any): void {
        const { containers: updatedContainers } = message.data;
        if (!Array.isArray(updatedContainers)) {
            return;
        }

        // Create a map of updated containers by ID for quick lookup
        const updatedMap = new Map(
            updatedContainers.map((c: Container) => [c.id, c]),
        );

        // Merge updated container data while preserving metrics and imageInfo
        const mergedContainers = containers.value.map((existing) => {
            const updated = updatedMap.get(existing.id);
            if (updated) {
                // Merge: keep existing metrics and imageInfo, update other fields
                return {
                    ...updated,
                    metrics: existing.metrics, // Preserve existing metrics
                    imageInfo: existing.imageInfo, // Preserve existing imageInfo
                };
            }
            return existing;
        });

        // Add any new containers that weren't in the previous list
        const existingIds = new Set(containers.value.map((c) => c.id));
        updatedContainers.forEach((updated: Container) => {
            if (!existingIds.has(updated.id)) {
                mergedContainers.push(updated);
            }
        });

        // Remove containers that are no longer in the list
        const updatedIds = new Set(
            updatedContainers.map((c: Container) => c.id),
        );
        const finalContainers = mergedContainers.filter((c) =>
            updatedIds.has(c.id),
        );

        containers.value = finalContainers;
        lastUpdated.value = new Date();
    }

    /**
     * Handle WebSocket metrics_update message
     */
    function handleMetricsUpdate(message: any): void {
        const { containerId, metrics } = message.data;

        const containerIndex = containers.value.findIndex(
            (c) => c.id === containerId,
        );
        if (containerIndex >= 0) {
            containers.value[containerIndex].metrics = metrics;
        }
    }

    /**
     * Handle WebSocket messages
     */
    function handleWebSocketMessage(message: WebSocketMessage): void {
        switch (message.type) {
            case "container_status_changed":
                handleStatusChanged(message);
                break;
            case "container_list":
                handleContainerListUpdate(message);
                break;
            case "metrics_update":
                handleMetricsUpdate(message);
                break;
            case "error":
                error.value = message.data?.reason || "WebSocket error";
                break;
        }
    }

    /**
     * Initialize on component mount
     */
    onMounted(async () => {
        // Initial fetch
        await fetchContainers();

        // Subscribe to WebSocket messages
        ws.onMessage(handleWebSocketMessage);

        // Handle WebSocket connection errors
        ws.onError((err) => {
            console.error("WebSocket error:", err);
            error.value =
                "Real-time updates unavailable. Metrics will update on refresh.";
        });

        // Connect to WebSocket for real-time updates
        try {
            await ws.connect();
            console.log("WebSocket connected successfully");

            // Request container updates after connection
            ws.send({ type: "ready" });
        } catch (err) {
            console.error("Failed to connect WebSocket:", err);
            // Continue with REST API polling, WebSocket is optional
            error.value =
                "Real-time updates unavailable. Metrics will update on refresh.";
        }
    });

    return {
        containers,
        filteredContainers,
        filters,
        loading,
        error,
        lastUpdated,
        fetchContainers,
    };
}
