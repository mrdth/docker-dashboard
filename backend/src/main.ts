/**
 * Docker Container Metrics Dashboard - Backend Server
 * Main entry point for Express server with WebSocket support
 */

import "dotenv/config";
import express, { Request, Response } from "express";
import expressWs from "express-ws";
import { getDockerService } from "./services/docker.service";
import { getLogger, log, logError } from "./logger/index";
import { corsMiddleware } from "./api/middleware/cors";
import { requestLoggerMiddleware } from "./api/middleware/request-logger";
import { errorHandler, asyncHandler } from "./api/middleware/error-handler";
import { handleWebSocketConnection } from "./websocket/handlers";
import { HealthCheckResponse } from "./models/index";
import containersRouter from "./api/routes/containers";
import { getUpdateChecker } from "./services/update-checker";

const logger = getLogger();
const app = express();
const wsApp = expressWs(app).app;

// Configuration
const PORT = parseInt(process.env.PORT || "3000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

// Middleware
wsApp.use(express.json());
wsApp.use(express.urlencoded({ extended: true }));
wsApp.use(corsMiddleware);
wsApp.use(requestLoggerMiddleware);

// Initialize Docker service and verify connection
let dockerServiceReady = false;

async function initializeDockerService(): Promise<void> {
    try {
        const dockerService = getDockerService();
        await dockerService.verifyVersion();
        dockerServiceReady = true;

        log("info", "Docker service initialized successfully", {
            service: "main",
            operation: "initializeDockerService",
        });
    } catch (error) {
        logError("Failed to initialize Docker service", error as Error, {
            service: "main",
            operation: "initializeDockerService",
        });

        // Don't exit, allow server to start but return 503 for container endpoints
        logger.warn("Server started without Docker connection", {
            service: "main",
            operation: "initializeDockerService",
        });
    }
}

// Routes

// T059: Register API routes
wsApp.use("/api/containers", containersRouter);

/**
 * Health check endpoint
 */
wsApp.get(
    "/health",
    asyncHandler(async (_req: Request, res: Response) => {
        const response: HealthCheckResponse = {
            status: dockerServiceReady ? "ok" : "error",
            docker: dockerServiceReady ? "ok" : "error",
            timestamp: new Date().toISOString(),
        };

        const statusCode = dockerServiceReady ? 200 : 503;

        res.status(statusCode).json(response);
    }),
);

/**
 * WebSocket endpoint for metrics streaming
 */
wsApp.ws("/api/metrics/stream", (ws, req) => {
    // Verify Docker is available
    if (!dockerServiceReady) {
        ws.send(
            JSON.stringify({
                type: "error",
                data: {
                    code: "DOCKER_DAEMON_UNAVAILABLE",
                    reason: "Docker daemon is not available",
                },
                timestamp: new Date().toISOString(),
            }),
        );
        ws.close(1011, "Docker unavailable");
        return;
    }

    handleWebSocketConnection(ws, req);
});

/**
 * API health check status route
 */
wsApp.get(
    "/api/health",
    asyncHandler(async (_req: Request, res: Response) => {
        const response: HealthCheckResponse = {
            status: dockerServiceReady ? "ok" : "error",
            docker: dockerServiceReady ? "ok" : "error",
            timestamp: new Date().toISOString(),
        };

        const statusCode = dockerServiceReady ? 200 : 503;

        res.status(statusCode).json(response);
    }),
);

/**
 * 404 Not Found handler
 */
wsApp.use((req: Request, res: Response) => {
    res.status(404).json({
        error: "Not Found",
        message: `Route ${req.path} not found`,
        timestamp: new Date().toISOString(),
    });
});

// Error handling middleware (must be last)
wsApp.use(errorHandler as any);

/**
 * Start server
 */
async function startServer(): Promise<void> {
    try {
        // Initialize Docker service
        await initializeDockerService();

        // T139: Start background update checker if Docker is available
        if (dockerServiceReady) {
            const updateChecker = getUpdateChecker();
            updateChecker.start();
        }

        // Start listening
        wsApp.listen(PORT, () => {
            log("info", `Server started`, {
                service: "main",
                operation: "startServer",
                port: PORT,
                environment: NODE_ENV,
            });
        });
    } catch (error) {
        logError("Failed to start server", error as Error, {
            service: "main",
            operation: "startServer",
        });
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
    logError("Uncaught Exception", error, {
        service: "main",
        operation: "uncaughtException",
    });
    process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: unknown) => {
    if (reason instanceof Error) {
        logError("Unhandled Rejection", reason, {
            service: "main",
            operation: "unhandledRejection",
        });
    } else {
        logger.error("Unhandled Rejection", {
            service: "main",
            operation: "unhandledRejection",
            reason: String(reason),
        });
    }
    process.exit(1);
});

// Start the server only if this module is being run directly (not imported for tests)
if (process.env.NODE_ENV !== "test") {
    startServer();
}

export default wsApp;
