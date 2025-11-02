/**
 * useWebSocket composable
 * Provides reactive WebSocket connection state and message handlers
 */

import { ref, onMounted, onUnmounted, Ref } from "vue";
import { getWebSocketConnection } from "../services/websocket";
import type { WebSocketMessage } from "../types/index";

interface WebSocketState {
    connected: boolean;
    reconnecting: boolean;
    error: Error | null;
}

export function useWebSocket() {
    const state: Ref<WebSocketState> = ref({
        connected: false,
        reconnecting: false,
        error: null,
    });

    const messages: Ref<WebSocketMessage[]> = ref([]);
    const ws = getWebSocketConnection();
    const unsubscribers: Array<() => void> = [];

    /**
     * Initialize WebSocket connection
     */
    const connect = async (): Promise<void> => {
        try {
            await ws.connect();
            state.value.connected = true;
            state.value.error = null;

            // Send ready signal
            ws.send({ type: "ready" });
        } catch (error) {
            state.value.error =
                error instanceof Error ? error : new Error("Failed to connect");
        }
    };

    /**
     * Disconnect from WebSocket
     */
    const disconnect = (): void => {
        ws.disconnect();
        state.value.connected = false;
    };

    /**
     * Send message to server
     */
    const send = (message: WebSocketMessage): void => {
        ws.send(message);
    };

    /**
     * Handle incoming message
     */
    const handleMessage = (message: WebSocketMessage): void => {
        messages.value.push(message);

        // Keep only last 100 messages
        if (messages.value.length > 100) {
            messages.value.shift();
        }
    };

    /**
     * Handle connection
     */
    const handleConnect = (): void => {
        state.value.connected = true;
        state.value.reconnecting = false;
        state.value.error = null;
    };

    /**
     * Handle disconnection
     */
    const handleDisconnect = (): void => {
        state.value.connected = false;
        state.value.reconnecting = true;
    };

    /**
     * Handle error
     */
    const handleError = (error: Error): void => {
        state.value.error = error;
    };

    // Set up subscriptions
    onMounted(() => {
        unsubscribers.push(ws.onMessage(handleMessage));
        unsubscribers.push(ws.onConnect(handleConnect));
        unsubscribers.push(ws.onDisconnect(handleDisconnect));
        unsubscribers.push(ws.onError(handleError));

        connect();
    });

    // Clean up subscriptions
    onUnmounted(() => {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        disconnect();
    });

    return {
        state: state as Ref<WebSocketState>,
        messages: messages as Ref<WebSocketMessage[]>,
        connect,
        disconnect,
        send,
        isConnected: () => ws.isConnected(),
    };
}
