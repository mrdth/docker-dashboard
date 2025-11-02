/**
 * useContainers composable
 * Manages container list state, REST fetches, and WebSocket updates
 */

import { ref, onMounted, Ref } from "vue";
import { get } from "../services/api";
import { getWebSocketConnection } from "../services/websocket";
import type { Container, WebSocketMessage } from "../types/index";

interface UseContainersState {
    containers: Ref<Container[]>;
    loading: Ref<boolean>;
    error: Ref<string | null>;
    lastUpdated: Ref<Date | null>;
}

export function useContainers(): UseContainersState & {
    fetchContainers: () => Promise<void>;
} {
    const containers = ref<Container[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastUpdated = ref<Date | null>(null);

    const ws = getWebSocketConnection();

    /**
     * T066: Fetch containers from REST API
     */
    async function fetchContainers(): Promise<void> {
        loading.value = true;
        error.value = null;

        try {
            const response = await get<{
                containers: Container[];
                error: null;
            }>("/api/containers");

            if (response && response.containers) {
                containers.value = response.containers;
                lastUpdated.value = new Date();
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
     */
    function handleContainerListUpdate(message: any): void {
        const { containers: updatedContainers } = message.data;
        if (Array.isArray(updatedContainers)) {
            containers.value = updatedContainers;
            lastUpdated.value = new Date();
        }
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

        // Request container updates
        ws.send({ type: "ready" });
    });

    return {
        containers,
        loading,
        error,
        lastUpdated,
        fetchContainers,
    };
}
