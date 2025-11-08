/**
 * Background Update Checker
 * Periodically checks for container image updates
 */

import { log, logError } from "../logger/index";
import { getDockerService } from "./docker.service";
import { getRegistryService } from "./registry.service";

export class UpdateChecker {
    private checkInterval: NodeJS.Timeout | null = null;
    private isRunning = false;
    private readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
    private checkedImages: Set<string> = new Set();

    /**
     * Start background update check job
     * Runs every 24 hours and checks for updates on all unique images
     */
    start(): void {
        if (this.isRunning) {
            log("info", "Update checker already running", {
                service: "update-checker",
                operation: "start",
            });
            return;
        }

        this.isRunning = true;

        // Run check immediately on start
        this.runCheck();

        // Schedule recurring checks
        this.checkInterval = setInterval(() => {
            this.runCheck();
        }, this.CHECK_INTERVAL_MS);

        log("info", "Update checker started", {
            service: "update-checker",
            operation: "start",
            intervalMs: this.CHECK_INTERVAL_MS,
        });
    }

    /**
     * Stop background update check job
     */
    stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;

        log("info", "Update checker stopped", {
            service: "update-checker",
            operation: "stop",
        });
    }

    /**
     * Run a single update check cycle
     */
    private async runCheck(): Promise<void> {
        try {
            const dockerService = getDockerService();
            const registryService = getRegistryService();

            log("info", "Starting update check cycle", {
                service: "update-checker",
                operation: "runCheck",
            });

            // Get all containers
            const containers = await dockerService.listContainers();

            // Collect unique images
            const uniqueImages = new Set<string>();
            containers.forEach((container) => {
                if (container.image) {
                    uniqueImages.add(container.image);
                }
            });

            log("info", "Found containers and images", {
                service: "update-checker",
                operation: "runCheck",
                containerCount: containers.length,
                uniqueImageCount: uniqueImages.size,
            });

            // Check each unique image
            let checkCount = 0;
            for (const imageName of uniqueImages) {
                try {
                    // Find a container using this image to get its created date
                    const containerWithImage = containers.find(
                        (c) => c.image === imageName,
                    );
                    const containerCreated = containerWithImage?.created;

                    await registryService.checkForUpdates(
                        imageName,
                        undefined,
                        containerCreated,
                    );
                    checkCount++;

                    // Log only if this is a new image being checked
                    if (!this.checkedImages.has(imageName)) {
                        this.checkedImages.add(imageName);
                        log("debug", "Checked image for updates", {
                            service: "update-checker",
                            operation: "runCheck",
                            imageName,
                        });
                    }
                } catch (error) {
                    logError(
                        "Failed to check image for updates",
                        error as Error,
                        {
                            service: "update-checker",
                            operation: "runCheck",
                            imageName,
                        },
                    );
                }
            }

            log("info", "Update check cycle completed", {
                service: "update-checker",
                operation: "runCheck",
                checkedImages: checkCount,
                totalCachedImages: registryService.getCacheSize(),
            });
        } catch (error) {
            logError("Update check cycle failed", error as Error, {
                service: "update-checker",
                operation: "runCheck",
            });
        }
    }

    /**
     * Get current status
     */
    getStatus(): {
        isRunning: boolean;
        checkedImages: number;
        nextCheckIn: number | null;
    } {
        return {
            isRunning: this.isRunning,
            checkedImages: this.checkedImages.size,
            nextCheckIn: this.checkInterval ? this.CHECK_INTERVAL_MS : null,
        };
    }
}

// Singleton instance
let updateCheckerInstance: UpdateChecker | null = null;

/**
 * Get or create UpdateChecker instance
 */
export function getUpdateChecker(): UpdateChecker {
    if (!updateCheckerInstance) {
        updateCheckerInstance = new UpdateChecker();
    }
    return updateCheckerInstance;
}

export default UpdateChecker;
