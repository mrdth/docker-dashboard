/**
 * WebSocket connection manager
 * Handles real-time communication with backend
 * Features: auto-reconnect, exponential backoff, message queuing
 */

import type { WebSocketMessage } from "../types/index";

/**
 * Determine WebSocket URL based on environment
 * In development, use same hostname as frontend but with port 3000 (backend)
 * In production, use VITE_WS_URL env var
 */
function getWsUrl(): string {
    const configUrl = import.meta.env.VITE_WS_URL as string;

    if (configUrl) {
        return configUrl;
    }

    // In development, use the same hostname but with backend port 3000
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;

    return `${protocol}//${hostname}:3000`;
}

const WS_URL = getWsUrl();

export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionHandler = () => void;
export type DisconnectionHandler = () => void;
export type ErrorHandler = (error: Error) => void;

interface ReconnectConfig {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
}

export class WebSocketConnection {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectConfig: ReconnectConfig;
    private reconnectAttempts = 0;
    private messageQueue: WebSocketMessage[] = [];
    private messageHandlers: Set<MessageHandler> = new Set();
    private connectionHandlers: Set<ConnectionHandler> = new Set();
    private disconnectionHandlers: Set<DisconnectionHandler> = new Set();
    private errorHandlers: Set<ErrorHandler> = new Set();
    private reconnectTimeout?: number;
    private pingInterval?: number;
    private isIntentionallyClosed = false;

    constructor(
        endpoint = "/api/metrics/stream",
        reconnectConfig?: Partial<ReconnectConfig>,
    ) {
        const baseUrl = WS_URL.replace(/\/$/, "");
        this.url = `${baseUrl}${endpoint}`;

        this.reconnectConfig = {
            maxAttempts: 10,
            initialDelay: 1000,
            maxDelay: 30000,
            ...reconnectConfig,
        };
    }

    /**
     * Connect to WebSocket server
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.isIntentionallyClosed = false;
                this.ws = new WebSocket(this.url);

                this.ws.addEventListener("open", () => {
                    this.reconnectAttempts = 0;
                    this.setupPingInterval();
                    this.flushMessageQueue();
                    this.callConnectionHandlers();
                    resolve();
                });

                this.ws.addEventListener("message", (event) => {
                    this.handleMessage(event.data);
                });

                this.ws.addEventListener("close", () => {
                    this.clearPingInterval();
                    if (!this.isIntentionallyClosed) {
                        this.callDisconnectionHandlers();
                        this.attemptReconnect();
                    }
                });

                this.ws.addEventListener("error", (_event) => {
                    this.clearPingInterval();
                    const error = new Error("WebSocket error");
                    this.callErrorHandlers(error);
                    reject(error);
                });
            } catch (error) {
                reject(
                    error instanceof Error
                        ? error
                        : new Error("Failed to connect"),
                );
            }
        });
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.isIntentionallyClosed = true;
        this.clearPingInterval();

        if (this.reconnectTimeout !== undefined) {
            clearTimeout(this.reconnectTimeout);
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.callDisconnectionHandlers();
    }

    /**
     * Send message to server
     */
    send(message: WebSocketMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message if not connected
            this.messageQueue.push(message);
        }
    }

    /**
     * Register message handler
     */
    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler);

        // Return unsubscribe function
        return () => {
            this.messageHandlers.delete(handler);
        };
    }

    /**
     * Register connection handler
     */
    onConnect(handler: ConnectionHandler): () => void {
        this.connectionHandlers.add(handler);

        return () => {
            this.connectionHandlers.delete(handler);
        };
    }

    /**
     * Register disconnection handler
     */
    onDisconnect(handler: DisconnectionHandler): () => void {
        this.disconnectionHandlers.add(handler);

        return () => {
            this.disconnectionHandlers.delete(handler);
        };
    }

    /**
     * Register error handler
     */
    onError(handler: ErrorHandler): () => void {
        this.errorHandlers.add(handler);

        return () => {
            this.errorHandlers.delete(handler);
        };
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Handle incoming message
     */
    private handleMessage(data: string): void {
        try {
            const message: WebSocketMessage = JSON.parse(data);
            this.callMessageHandlers(message);
        } catch (error) {
            const err =
                error instanceof Error
                    ? error
                    : new Error("Failed to parse message");
            this.callErrorHandlers(err);
        }
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    private attemptReconnect(): void {
        if (
            this.isIntentionallyClosed ||
            this.reconnectAttempts >= this.reconnectConfig.maxAttempts
        ) {
            const error = new Error("Max reconnection attempts reached");
            this.callErrorHandlers(error);
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            this.reconnectConfig.initialDelay *
                Math.pow(2, this.reconnectAttempts - 1),
            this.reconnectConfig.maxDelay,
        );

        this.reconnectTimeout = window.setTimeout(() => {
            this.connect().catch((error) => {
                this.callErrorHandlers(error);
            });
        }, delay);
    }

    /**
     * Flush queued messages
     */
    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                this.send(message);
            }
        }
    }

    /**
     * Set up ping interval for keep-alive
     */
    private setupPingInterval(): void {
        this.pingInterval = window.setInterval(() => {
            if (this.isConnected()) {
                this.send({ type: "ping" });
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Clear ping interval
     */
    private clearPingInterval(): void {
        if (this.pingInterval !== undefined) {
            clearInterval(this.pingInterval);
            this.pingInterval = undefined;
        }
    }

    /**
     * Call all message handlers
     */
    private callMessageHandlers(message: WebSocketMessage): void {
        this.messageHandlers.forEach((handler) => {
            try {
                handler(message);
            } catch (error) {
                const err =
                    error instanceof Error ? error : new Error("Handler error");
                this.callErrorHandlers(err);
            }
        });
    }

    /**
     * Call all connection handlers
     */
    private callConnectionHandlers(): void {
        this.connectionHandlers.forEach((handler) => {
            try {
                handler();
            } catch (error) {
                const err =
                    error instanceof Error ? error : new Error("Handler error");
                this.callErrorHandlers(err);
            }
        });
    }

    /**
     * Call all disconnection handlers
     */
    private callDisconnectionHandlers(): void {
        this.disconnectionHandlers.forEach((handler) => {
            try {
                handler();
            } catch (error) {
                const err =
                    error instanceof Error ? error : new Error("Handler error");
                this.callErrorHandlers(err);
            }
        });
    }

    /**
     * Call all error handlers
     */
    private callErrorHandlers(error: Error): void {
        this.errorHandlers.forEach((handler) => {
            try {
                handler(error);
            } catch {
                // Ignore errors in error handlers
            }
        });
    }
}

// Singleton instance
let wsInstance: WebSocketConnection | null = null;

/**
 * Get or create WebSocket connection instance
 */
export function getWebSocketConnection(
    endpoint?: string,
    reconnectConfig?: Partial<ReconnectConfig>,
): WebSocketConnection {
    if (!wsInstance) {
        wsInstance = new WebSocketConnection(endpoint, reconnectConfig);
    }
    return wsInstance;
}

export default WebSocketConnection;
