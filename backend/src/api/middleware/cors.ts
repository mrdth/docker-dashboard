/**
 * CORS middleware configuration
 */

import { Request, Response, NextFunction } from "express";
import { log } from "../../logger/index";

/**
 * Create CORS middleware with configurable origin
 */
export function corsMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const origin = req.headers.origin;

    // Determine if origin is allowed
    let isAllowed = false;

    if (!origin) {
        // No origin header (direct server access)
        isAllowed = true;
    } else if (origin === frontendUrl) {
        // Exact match with FRONTEND_URL
        isAllowed = true;
    } else {
        // Check if origin is localhost or 127.0.0.1 on port 5173 (development)
        // Also allow any local network IP on port 5173
        try {
            const originUrl = new URL(origin);
            const port = originUrl.port || "80";
            const hostname = originUrl.hostname;

            // Allow localhost/127.0.0.1 on any port in development
            if (
                (hostname === "localhost" || hostname === "127.0.0.1") &&
                (port === "5173" || port === "3000")
            ) {
                isAllowed = true;
            }
            // Allow any IP on port 5173 (Vite dev server on local network)
            else if (port === "5173") {
                isAllowed = true;
            }
            // Allow any IP on port 3000 (backend dev server)
            else if (port === "3000") {
                isAllowed = true;
            }
        } catch (error) {
            // Invalid origin URL - reject it
            isAllowed = false;
        }
    }

    if (isAllowed) {
        // Allow the origin
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS",
        );
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
        );
        res.setHeader("Access-Control-Allow-Credentials", "true");

        // Handle preflight requests
        if (req.method === "OPTIONS") {
            res.sendStatus(200);
            return;
        }
    } else if (origin) {
        log("warn", "CORS request from unauthorized origin", {
            service: "api",
            operation: "corsMiddleware",
            origin,
            allowedOrigin: frontendUrl,
        });
    }

    next();
}
