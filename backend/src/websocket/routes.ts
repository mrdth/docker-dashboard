/**
 * WebSocket routes configuration
 * Sets up WebSocket endpoint with express-ws
 */

import { Router } from "express";
import { handleWebSocketConnection } from "./handlers";
import { getLogger } from "../logger/index";

const logger = getLogger();

/**
 * Configure WebSocket routes
 * T062: GET /api/metrics/stream WebSocket endpoint
 */
export function configureWebSocketRoutes(_app: any): void {
    // Apply express-ws to the app
    const wsRouter = Router();

    // T062: WebSocket endpoint for metrics streaming
    wsRouter.ws("/api/metrics/stream", (ws, req) => {
        try {
            handleWebSocketConnection(ws, req);
        } catch (error) {
            logger.error("WebSocket connection error", {
                service: "websocket",
                operation: "configureRoute",
                error: error instanceof Error ? error.message : String(error),
            });

            ws.send(
                JSON.stringify({
                    type: "error",
                    data: {
                        code: "WEBSOCKET_ERROR",
                        reason: "Failed to establish WebSocket connection",
                    },
                    timestamp: new Date().toISOString(),
                }),
            );

            ws.close(1011, "Internal server error");
        }
    });

    return wsRouter as any;
}

export default configureWebSocketRoutes;
