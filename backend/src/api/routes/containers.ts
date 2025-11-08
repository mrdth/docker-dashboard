/**
 * Container API routes
 * Handles container listing, filtering, and details
 */

import { Router, Request, Response, NextFunction } from "express";
import { getDockerService } from "../../services/docker.service";
import { getRegistryService } from "../../services/registry.service";
import { DockerDaemonError, ContainerNotFoundError } from "../../models/errors";
import { logError, log } from "../../logger/index";
import { asyncHandler } from "../middleware/error-handler";

const router = Router();
const dockerService = getDockerService();

/**
 * Validate query parameters for container list
 */
function validateContainerListQuery(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const { status, name } = req.query;

    // Validate status parameter
    if (status && typeof status === "string") {
        const validStatuses = ["running", "stopped", "paused", "exited"];
        if (!validStatuses.includes(status)) {
            res.status(400).json({
                error: "Invalid status parameter",
                message: `Status must be one of: ${validStatuses.join(", ")}`,
                timestamp: new Date().toISOString(),
            });
            return;
        }
    }

    // Validate name parameter
    if (name && typeof name === "string") {
        if (name.length === 0) {
            // Empty name is allowed, will be ignored
        }
    }

    next();
}

/**
 * T056: GET /api/containers
 * Returns all containers with optional name and status filters
 */
router.get(
    "/",
    validateContainerListQuery,
    asyncHandler(async (req: Request, res: Response) => {
        try {
            const { status, name } = req.query;

            let containers = await dockerService.listContainers();

            // Filter by status if provided
            if (status && typeof status === "string") {
                containers = containers.filter((c) => c.status === status);

                log("info", "Container list filtered by status", {
                    service: "api",
                    operation: "listContainers",
                    status,
                    count: containers.length,
                });
            }

            // Filter by name if provided (case-insensitive substring match)
            if (name && typeof name === "string" && name.length > 0) {
                const nameLower = name.toLowerCase();
                containers = containers.filter((c) =>
                    c.name.toLowerCase().includes(nameLower),
                );

                log("info", "Container list filtered by name", {
                    service: "api",
                    operation: "listContainers",
                    name,
                    count: containers.length,
                });
            }

            // Return container list immediately without waiting for imageInfo
            // imageInfo will be fetched asynchronously and updates will be sent via WebSocket
            res.json({
                containers,
                error: null,
                timestamp: new Date().toISOString(),
            });

            // Fetch imageInfo asynchronously in the background after returning response
            // This prevents blocking the initial container list render
            setImmediate(async () => {
                const registryService = getRegistryService();
                for (const container of containers) {
                    try {
                        const imageInfo = await registryService.checkForUpdates(
                            container.image,
                            undefined,
                            container.created,
                        );

                        log("debug", "Fetched imageInfo for container", {
                            service: "api",
                            operation: "listContainers",
                            containerId: container.id,
                            image: container.image,
                            updateAvailable: imageInfo?.updateAvailable,
                        });

                        // Broadcast imageInfo update via WebSocket to all connected clients
                        // This allows the frontend to update the container's imageInfo as it arrives
                        if (imageInfo) {
                            const { getWebSocketManager } = await import(
                                "../../websocket/manager"
                            );
                            const wsManager = getWebSocketManager();
                            wsManager.broadcast({
                                type: "imageinfo_update" as const,
                                data: {
                                    containerId: container.id,
                                    imageInfo,
                                },
                                timestamp: new Date().toISOString(),
                            });

                            log(
                                "debug",
                                "Broadcast imageinfo_update via WebSocket",
                                {
                                    service: "api",
                                    operation: "listContainers",
                                    containerId: container.id,
                                    updateAvailable: imageInfo.updateAvailable,
                                },
                            );
                        }
                    } catch (error) {
                        // Log error but don't fail - imageInfo is optional
                        logError(
                            "Failed to fetch imageInfo for container",
                            error as Error,
                            {
                                service: "api",
                                operation: "listContainers",
                                containerId: container.id,
                                image: container.image,
                            },
                        );
                    }
                }
            });
        } catch (error) {
            if (error instanceof DockerDaemonError) {
                // T058: Return 503 for Docker daemon unavailable
                res.status(503).json({
                    error: "DOCKER_DAEMON_UNAVAILABLE",
                    message: "Docker daemon is not available",
                    timestamp: new Date().toISOString(),
                });

                logError("Docker daemon unavailable", error as Error, {
                    service: "api",
                    operation: "listContainers",
                });
            } else {
                throw error;
            }
        }
    }),
);

/**
 * T082: GET /api/containers/:id
 * Returns single container with full details including metrics
 */
router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const container = await dockerService.getContainer(id);

            // T082: Fetch metrics for the container
            try {
                container.metrics = await dockerService.getContainerStats(id);
            } catch (error) {
                // T093: Handle metrics unavailable state gracefully
                container.metrics = {
                    cpu: {
                        percentage: 0,
                        cores: 0,
                        systemUsage: 0,
                        containerUsage: 0,
                    },
                    memory: { usage: 0, limit: 0, percentage: 0 },
                    diskIo: {
                        readBytes: 0,
                        writeBytes: 0,
                        readBytesPerSec: 0,
                        writeBytesPerSec: 0,
                    },
                    networkIo: {
                        receivedBytes: 0,
                        sentBytes: 0,
                        receivedBytesPerSec: 0,
                        sentBytesPerSec: 0,
                    },
                    timestamp: new Date().toISOString(),
                    status: "unavailable",
                };

                log(
                    "warn",
                    "Failed to fetch container metrics, using unavailable status",
                    {
                        service: "api",
                        operation: "getContainerDetail",
                        containerId: id,
                    },
                );
            }

            // T104-T108: Fetch ports and logs for the container
            try {
                // T105: Fetch ports from docker service
                container.ports = await dockerService.getPorts(id);
            } catch (error) {
                // T108: Handle edge case gracefully - no ports is valid
                container.ports = [];
                logError("Failed to fetch container ports", error as Error, {
                    service: "api",
                    operation: "getContainerDetail",
                    containerId: id,
                });
            }

            try {
                // T106-T107: Fetch logs from docker service
                container.logs = await dockerService.getLogs(id);
            } catch (error) {
                // Handle log fetch failure gracefully
                container.logs = [];
                logError("Failed to fetch container logs", error as Error, {
                    service: "api",
                    operation: "getContainerDetail",
                    containerId: id,
                });
            }

            res.json({
                container,
                error: null,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            if (error instanceof ContainerNotFoundError) {
                res.status(404).json({
                    error: "CONTAINER_NOT_FOUND",
                    message: `Container ${req.params.id} not found`,
                    timestamp: new Date().toISOString(),
                });
            } else if (error instanceof DockerDaemonError) {
                res.status(503).json({
                    error: "DOCKER_DAEMON_UNAVAILABLE",
                    message: "Docker daemon is not available",
                    timestamp: new Date().toISOString(),
                });
            } else {
                throw error;
            }
        }
    }),
);

export default router;
