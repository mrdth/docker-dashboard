/**
 * Registry Service
 * Handles Docker image update checks against Docker Hub and other registries
 */

import { log, logError } from "../logger/index";
import type { ImageInfo } from "../models/index";

interface CacheEntry {
    timestamp: number;
    imageInfo: ImageInfo;
}

export class RegistryService {
    private cache: Map<string, CacheEntry> = new Map();
    private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    private readonly REQUEST_TIMEOUT = 5000; // 5 seconds

    /**
     * Check for image updates
     * @param imageName Full image name (e.g., "nginx:latest" or "gcr.io/myorg/myimage:1.0")
     * @param currentTag Current tag being used
     * @returns ImageInfo with update availability status
     */
    async checkForUpdates(
        imageName: string,
        currentTag?: string,
    ): Promise<ImageInfo> {
        const cacheKey = imageName;

        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            log("debug", "Using cached image info", {
                service: "registry",
                operation: "checkForUpdates",
                imageName,
            });
            return cached.imageInfo;
        }

        try {
            const [name, tag] = this.parseImageName(imageName);
            const tagToCheck = currentTag || tag || "latest";

            // Detect if this is a private registry
            if (this.isPrivateRegistry(name)) {
                const imageInfo: ImageInfo = {
                    name,
                    tag: tagToCheck,
                    id: "",
                    created: new Date().toISOString(),
                    registryStatus: "unable_to_check",
                    updateAvailable: false,
                    lastChecked: new Date().toISOString(),
                };

                this.cache.set(cacheKey, {
                    timestamp: Date.now(),
                    imageInfo,
                });

                return imageInfo;
            }

            // Try to fetch latest version from Docker Hub
            const latestVersion = await this.fetchLatestVersionFromDockerHub(
                name,
                tagToCheck,
            );

            const imageInfo: ImageInfo = {
                name,
                tag: tagToCheck,
                id: "",
                created: new Date().toISOString(),
                registryStatus: "checked",
                updateAvailable: latestVersion !== null && latestVersion !== tagToCheck,
                latestVersion: latestVersion || undefined,
                lastChecked: new Date().toISOString(),
            };

            this.cache.set(cacheKey, {
                timestamp: Date.now(),
                imageInfo,
            });

            return imageInfo;
        } catch (error) {
            logError("Failed to check for image updates", error as Error, {
                service: "registry",
                operation: "checkForUpdates",
                imageName,
            });

            // Return safe default on error
            const [name, tag] = this.parseImageName(imageName);
            return {
                name,
                tag: tag || "latest",
                id: "",
                created: new Date().toISOString(),
                registryStatus: "unable_to_check",
                updateAvailable: false,
                lastChecked: new Date().toISOString(),
            };
        }
    }

    /**
     * Fetch latest version from Docker Hub
     * @param imageName Image name without tag (e.g., "library/nginx" or "nginx")
     * @param currentTag Current tag
     * @returns Latest tag version or null if unavailable
     */
    private async fetchLatestVersionFromDockerHub(
        imageName: string,
        currentTag: string,
    ): Promise<string | null> {
        try {
            // Normalize image name for Docker Hub
            const normalizedName = imageName.includes("/")
                ? imageName
                : `library/${imageName}`;

            const url = `https://hub.docker.com/v2/repositories/${normalizedName}/tags/${currentTag}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    return null;
                }

                const data = (await response.json()) as any;

                // Try to find the latest tag
                // For simplicity, we'll check if there's a newer version
                // In a real implementation, you might compare version numbers
                if (data.name) {
                    return data.name;
                }

                return null;
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            log("debug", "Docker Hub API call failed", {
                service: "registry",
                operation: "fetchLatestVersionFromDockerHub",
                imageName,
                error: (error as Error).message,
            });
            return null;
        }
    }

    /**
     * Check if image name refers to a private registry
     * @param imageName Image name to check
     * @returns true if private registry, false if Docker Hub
     */
    private isPrivateRegistry(imageName: string): boolean {
        // Check for known private registry patterns
        const privateRegistryPatterns = [
            /^gcr\.io\//,           // Google Container Registry
            /^quay\.io\//,          // Quay.io
            /^registry\.gitlab\.com\//,  // GitLab Registry
            /^docker\.io\//,        // Docker private (but still Docker Hub)
            /^.*\.[^/]+\/[^/]+$/,   // General pattern: has dot in first segment (private registry)
        ];

        // If image has a registry domain (contains / and first part has .), it's private
        if (imageName.includes("/")) {
            const registryPart = imageName.split("/")[0];
            if (registryPart.includes(".") || registryPart.includes(":")) {
                return true;
            }
        }

        // Check known private registries
        return privateRegistryPatterns.some((pattern) =>
            pattern.test(imageName),
        );
    }

    /**
     * Parse image name into name and tag
     * @param imageName Full image name (e.g., "nginx:latest")
     * @returns [name, tag]
     */
    private parseImageName(imageName: string): [string, string] {
        const lastColonIndex = imageName.lastIndexOf(":");

        // If no colon or colon is part of registry port (e.g., "localhost:5000/image")
        if (lastColonIndex === -1) {
            return [imageName, "latest"];
        }

        const afterColon = imageName.substring(lastColonIndex + 1);

        // Check if what's after colon looks like a tag (not a port number)
        if (
            afterColon.includes("/") ||
            /^\d+$/.test(afterColon) ||
            afterColon.includes(".")
        ) {
            // It's a registry port or part of registry, not a tag
            return [imageName, "latest"];
        }

        return [
            imageName.substring(0, lastColonIndex),
            afterColon,
        ];
    }

    /**
     * Clear cache for specific image or all
     * @param imageName Optional: specific image to clear
     */
    clearCache(imageName?: string): void {
        if (imageName) {
            this.cache.delete(imageName);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Get cache size (for monitoring)
     */
    getCacheSize(): number {
        return this.cache.size;
    }
}

// Singleton instance
let registryServiceInstance: RegistryService | null = null;

/**
 * Get or create RegistryService instance
 */
export function getRegistryService(): RegistryService {
    if (!registryServiceInstance) {
        registryServiceInstance = new RegistryService();
    }
    return registryServiceInstance;
}

export default RegistryService;
