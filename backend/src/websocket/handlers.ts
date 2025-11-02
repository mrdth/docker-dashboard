/**
 * WebSocket message handlers
 */

import { Request } from "express";
import type { WebSocket } from "ws";
import { getWebSocketManager } from "./manager";
import { getDockerService } from "../services/docker.service";
import { getLogger } from "../logger/index";
import { WebSocketMessage } from "./message-types";

const logger = getLogger();
const wsManager = getWebSocketManager();
const dockerService = getDockerService();

/**
 * Handle incoming WebSocket message
 */
export async function handleWebSocketMessage(
    clientId: string,
    message: WebSocketMessage,
): Promise<void> {
    try {
        logger.debug("WebSocket message received", {
            service: "websocket",
            operation: "handleMessage",
            clientId,
            messageType: message.type,
        });

        switch (message.type) {
            case "ready":
                handleReady(clientId);
                break;

            case "get_containers":
                await handleGetContainers(clientId);
                break;

            case "get_container_detail":
                await handleGetContainerDetail(clientId, message.data);
                break;

            case "pong":
                wsManager.handlePong(clientId);
                break;

            case "close":
                handleClose(clientId);
                break;

            default:
                logger.warn("Unknown WebSocket message type", {
                    service: "websocket",
                    operation: "handleMessage",
                    clientId,
                    messageType: (message as any).type,
                });
        }
    } catch (error) {
        logger.error("Error handling WebSocket message", {
            service: "websocket",
            operation: "handleMessage",
            clientId,
            error: error instanceof Error ? error.message : "Unknown error",
        });

        wsManager.sendError(
            clientId,
            "MESSAGE_HANDLER_ERROR",
            "Failed to process message",
        );
    }
}

/**
 * Handle client ready signal
 */
function handleReady(clientId: string): void {
    logger.info("Client ready", {
        service: "websocket",
        operation: "handleReady",
        clientId,
    });

    // Send initial container list
    handleGetContainers(clientId).catch((error) => {
        logger.error("Failed to send initial container list", {
            service: "websocket",
            operation: "handleReady",
            clientId,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    });
}

/**
 * Handle get containers request
 */
async function handleGetContainers(clientId: string): Promise<void> {
    try {
        const containers = await dockerService.listContainers();

        wsManager.sendToClient(clientId, {
            type: "container_list",
            data: { containers },
            timestamp: new Date().toISOString(),
        });

        logger.debug("Container list sent to client", {
            service: "websocket",
            operation: "handleGetContainers",
            clientId,
            containerCount: containers.length,
        });
    } catch (error) {
        logger.error("Failed to get containers", {
            service: "websocket",
            operation: "handleGetContainers",
            clientId,
            error: error instanceof Error ? error.message : "Unknown error",
        });

        wsManager.sendError(
            clientId,
            "GET_CONTAINERS_ERROR",
            error instanceof Error ? error.message : "Failed to get containers",
        );
    }
}

/**
 * Handle get container detail request
 */
async function handleGetContainerDetail(
    clientId: string,
    data: any,
): Promise<void> {
    try {
        const { containerId } = data;

        if (!containerId) {
            wsManager.sendError(
                clientId,
                "INVALID_REQUEST",
                "containerId is required",
            );
            return;
        }

        const container = await dockerService.getContainer(containerId);

        // Fetch additional details
        const [ports, logs, metrics] = await Promise.allSettled([
            dockerService.getPorts(container.fullId),
            dockerService.getLogs(container.fullId),
            container.status === "running"
                ? dockerService.getContainerStats(container.fullId)
                : Promise.resolve(undefined),
        ]);

        container.ports = ports.status === "fulfilled" ? ports.value : [];
        container.logs = logs.status === "fulfilled" ? logs.value : [];
        if (metrics.status === "fulfilled" && metrics.value) {
            container.metrics = metrics.value;
        }

        wsManager.sendToClient(clientId, {
            type: "container_detail",
            data: { container },
            timestamp: new Date().toISOString(),
        });

        logger.debug("Container detail sent to client", {
            service: "websocket",
            operation: "handleGetContainerDetail",
            clientId,
            containerId,
        });
    } catch (error) {
        logger.error("Failed to get container detail", {
            service: "websocket",
            operation: "handleGetContainerDetail",
            clientId,
            error: error instanceof Error ? error.message : "Unknown error",
        });

        wsManager.sendError(
            clientId,
            "GET_CONTAINER_DETAIL_ERROR",
            error instanceof Error
                ? error.message
                : "Failed to get container detail",
        );
    }
}

/**
 * Handle client close signal
 */
function handleClose(clientId: string): void {
    logger.info("Client closed", {
        service: "websocket",
        operation: "handleClose",
        clientId,
    });

    wsManager.unregisterClient(clientId);
}

/**
 * Handle WebSocket connection
 */
export function handleWebSocketConnection(ws: WebSocket, _req: Request): void {
    const clientId = wsManager.registerClient(ws);

    // Handle incoming messages
    ws.on("message", (data: string) => {
        try {
            const message = JSON.parse(data);
            handleWebSocketMessage(clientId, message).catch((error) => {
                logger.error("Unhandled error in message handler", {
                    service: "websocket",
                    operation: "messageHandler",
                    clientId,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                });
            });
        } catch (error) {
            logger.error("Failed to parse WebSocket message", {
                service: "websocket",
                operation: "messageHandler",
                clientId,
                error: error instanceof Error ? error.message : "Invalid JSON",
            });

            wsManager.sendError(
                clientId,
                "PARSE_ERROR",
                "Invalid message format",
            );
        }
    });

    // Handle client disconnect
    ws.on("close", () => {
        wsManager.unregisterClient(clientId);
    });

    // Handle errors
    ws.on("error", (error: Error) => {
        logger.error("WebSocket error", {
            service: "websocket",
            operation: "errorHandler",
            clientId,
            error: error.message,
        });

        wsManager.unregisterClient(clientId);
    });
}
