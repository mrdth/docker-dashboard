/**
 * Container API routes
 * Handles container listing, filtering, and details
 */

import { Router, Request, Response, NextFunction } from "express";
import { getDockerService } from "../../services/docker.service";
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

            res.json({
                containers,
                error: null,
                timestamp: new Date().toISOString(),
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
