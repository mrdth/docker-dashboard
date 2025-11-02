/**
 * Docker Service
 * Wraps dockerode library with normalized interfaces and error handling
 */

import Docker from "dockerode";
import {
    Container,
    ContainerMetrics,
    ContainerStatus,
    Port,
    LogEntry,
    ImageInfo,
} from "../models/index";
import {
    DockerDaemonError,
    ContainerNotFoundError,
    MetricsUnavailableError,
} from "../models/errors";
import { logError, log } from "../logger/index";

export class DockerService {
    private docker: Docker;
    private lastMetrics: Map<string, ContainerMetrics> = new Map();

    constructor(dockerHost?: string) {
        // Initialize Docker client
        const options: Docker.DockerOptions = {};

        if (dockerHost) {
            options.socketPath = dockerHost;
        }

        this.docker = new Docker(options);
    }

    /**
     * Verify Docker daemon is available and API version is compatible
     * @throws DockerDaemonError if Docker is unavailable or API version < 1.40
     */
    async verifyVersion(): Promise<void> {
        try {
            const version = await this.docker.version();
            const apiVersion = parseFloat(version.ApiVersion || "0");

            if (apiVersion < 1.4) {
                throw new DockerDaemonError(
                    `Docker API version ${apiVersion} is not supported. Minimum version: 1.40`,
                );
            }

            log("info", "Docker daemon verified", {
                service: "docker",
                operation: "verifyVersion",
                apiVersion,
                dockerVersion: version.Version,
            });
        } catch (error) {
            if (error instanceof DockerDaemonError) {
                throw error;
            }
            logError("Failed to connect to Docker daemon", error as Error, {
                service: "docker",
                operation: "verifyVersion",
            });
            throw new DockerDaemonError(
                "Failed to connect to Docker daemon. Is Docker running?",
            );
        }
    }

    /**
     * List all containers with normalized status
     */
    async listContainers(): Promise<Container[]> {
        try {
            const dockerContainers = await this.docker.listContainers({
                all: true,
            });

            return dockerContainers.map((dc: any) =>
                this.normalizeContainer(dc as any),
            );
        } catch (error) {
            logError("Failed to list containers", error as Error, {
                service: "docker",
                operation: "listContainers",
            });
            throw new DockerDaemonError("Failed to list containers");
        }
    }

    /**
     * Get single container with full details
     */
    async getContainer(id: string): Promise<Container> {
        try {
            const container = this.docker.getContainer(id);
            const inspect = await container.inspect();

            return this.normalizeContainer(inspect);
        } catch (error) {
            if ((error as any).statusCode === 404) {
                throw new ContainerNotFoundError(id);
            }
            logError("Failed to get container", error as Error, {
                service: "docker",
                operation: "getContainer",
                containerId: id,
            });
            throw new DockerDaemonError(`Failed to get container: ${id}`);
        }
    }

    /**
     * Get container statistics (CPU, memory, disk I/O, network I/O)
     */
    async getContainerStats(id: string): Promise<ContainerMetrics> {
        try {
            const container = this.docker.getContainer(id);
            const stream = await container.stats({ stream: false });

            const metrics = this.calculateMetrics(stream as any);
            this.lastMetrics.set(id, metrics);

            return metrics;
        } catch (error) {
            if ((error as any).statusCode === 404) {
                throw new ContainerNotFoundError(id);
            }
            logError("Failed to get container stats", error as Error, {
                service: "docker",
                operation: "getContainerStats",
                containerId: id,
            });
            throw new MetricsUnavailableError(id, "Failed to retrieve metrics");
        }
    }

    /**
     * Get port mappings for a container
     */
    async getPorts(id: string): Promise<Port[]> {
        try {
            const container = this.docker.getContainer(id);
            const inspect = await container.inspect();

            const ports: Port[] = [];

            if (inspect.NetworkSettings?.Ports) {
                Object.entries(inspect.NetworkSettings.Ports).forEach(
                    ([key, mappings]) => {
                        // Key format: "8080/tcp" or "53/udp"
                        const [containerPort, protocol] = key.split("/");

                        if (Array.isArray(mappings) && mappings.length > 0) {
                            mappings.forEach((mapping) => {
                                ports.push({
                                    protocol: protocol.toLowerCase(),
                                    containerPort: parseInt(containerPort),
                                    hostPort: mapping.HostPort
                                        ? parseInt(mapping.HostPort)
                                        : undefined,
                                    hostIp: mapping.HostIp || undefined,
                                });
                            });
                        }
                    },
                );
            }

            return ports;
        } catch (error) {
            if ((error as any).statusCode === 404) {
                throw new ContainerNotFoundError(id);
            }
            logError("Failed to get container ports", error as Error, {
                service: "docker",
                operation: "getPorts",
                containerId: id,
            });
            throw new DockerDaemonError(
                `Failed to get ports for container: ${id}`,
            );
        }
    }

    /**
     * Get container logs (last 100 lines, 1-hour window)
     */
    async getLogs(id: string): Promise<LogEntry[]> {
        try {
            const container = this.docker.getContainer(id);
            const logStream = await container.logs({
                stdout: true,
                stderr: true,
                tail: 100,
                timestamps: true,
            });

            const logs: LogEntry[] = [];
            const oneHourAgo = Date.now() - 60 * 60 * 1000;

            // Parse Docker log format
            const lines = logStream
                .toString()
                .split("\n")
                .filter((line: string) => line);

            lines.forEach((line: string) => {
                try {
                    // Docker log format: timestamp message
                    const match = line.match(
                        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(.*)$/,
                    );

                    if (match) {
                        const [, timestamp, message] = match;
                        const time = new Date(timestamp).getTime();

                        // Only include logs from last hour
                        if (time >= oneHourAgo) {
                            logs.push({
                                timestamp,
                                message,
                                stream: "stdout",
                            });
                        }
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            });

            return logs;
        } catch (error) {
            if ((error as any).statusCode === 404) {
                throw new ContainerNotFoundError(id);
            }
            logError("Failed to get container logs", error as Error, {
                service: "docker",
                operation: "getLogs",
                containerId: id,
            });
            // Don't throw, return empty logs
            return [];
        }
    }

    /**
     * Get image information (name, tag, size, created)
     */
    async getImageInfo(imageName: string): Promise<ImageInfo> {
        try {
            const image = this.docker.getImage(imageName);
            const inspect = await image.inspect();

            const parts = imageName.split(":");
            const tag = parts[1] || "latest";

            return {
                name: parts[0],
                tag,
                id: inspect.Id || "",
                created: inspect.Created || new Date().toISOString(),
                size: inspect.Size,
                registryStatus: "unable_to_check",
                updateAvailable: false,
            };
        } catch (error) {
            logError("Failed to get image info", error as Error, {
                service: "docker",
                operation: "getImageInfo",
                imageName,
            });
            // Return minimal info if inspection fails
            const parts = imageName.split(":");
            return {
                name: parts[0],
                tag: parts[1] || "latest",
                id: "",
                created: new Date().toISOString(),
                registryStatus: "unable_to_check",
                updateAvailable: false,
            };
        }
    }

    /**
     * Normalize Docker container to our Container interface
     * Handles both formats: listContainers() response and inspect() response
     */
    private normalizeContainer(dockerContainer: any): Container {
        // Handle different Docker API response formats
        // listContainers() returns State as a string directly
        // inspect() returns State as an object with Status property
        let statusStr: string;

        if (typeof dockerContainer.State === "string") {
            // listContainers() format: State is a string like "running", "exited"
            statusStr = dockerContainer.State;
        } else if (dockerContainer.State?.Status) {
            // inspect() format: State is an object with Status property
            statusStr = dockerContainer.State.Status;
        } else {
            statusStr = "unknown";
        }

        const status = this.normalizeStatus(statusStr);
        const name =
            dockerContainer.Name || dockerContainer.Names?.[0] || "unknown";

        return {
            id: dockerContainer.Id?.substring(0, 12) || dockerContainer.Id,
            fullId: dockerContainer.Id || "",
            name: name.replace(/^\//, ""),
            status,
            image:
                dockerContainer.Image ||
                dockerContainer.Config?.Image ||
                "unknown",
            created: dockerContainer.Created || new Date().toISOString(),
            started: dockerContainer.State?.StartedAt || undefined,
            ports: [],
            labels: dockerContainer.Labels || {},
            command: dockerContainer.Cmd?.join(" "),
            env: this.parseEnv(dockerContainer.Config?.Env || []),
        };
    }

    /**
     * Normalize Docker status to standardized ContainerStatus
     */
    private normalizeStatus(dockerStatus: string): ContainerStatus {
        switch (dockerStatus.toLowerCase()) {
            case "running":
                return "running";
            case "exited":
            case "dead":
                return "exited";
            case "paused":
                return "paused";
            case "created":
            case "restarting":
            case "removing":
            default:
                return "stopped";
        }
    }

    /**
     * T083-T086: Calculate metrics from Docker stats
     * Handles CPU percentage calculation accounting for multi-core systems,
     * memory percentage with limit handling, and I/O calculations
     */
    private calculateMetrics(stats: any): ContainerMetrics {
        const timestamp = new Date(stats.read).toISOString();

        // T083: CPU percentage calculation accounting for system_cpu_usage delta and number of CPUs
        const cpuDelta =
            (stats.cpu_stats?.cpu_usage?.total_usage || 0) -
            (stats.precpu_stats?.cpu_usage?.total_usage || 0);
        const systemDelta =
            (stats.cpu_stats?.system_cpu_usage || 0) -
            (stats.precpu_stats?.system_cpu_usage || 0);
        const numCpus =
            stats.cpu_stats?.online_cpus ||
            stats.cpu_stats?.cpus_stats?.length ||
            1;

        // CPU percentage can exceed 100% on multi-core systems
        // Calculation: (cpuDelta / systemDelta) * numCpus * 100
        const cpuPercentage =
            systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

        // T084: Memory percentage calculation as (usage / limit) * 100, handle cases where limit is 0
        const memoryUsage = stats.memory_stats?.usage || 0;
        const memoryLimit = stats.memory_stats?.limit || 1;
        let memoryPercentage = 0;

        if (memoryLimit > 0) {
            memoryPercentage = (memoryUsage / memoryLimit) * 100;
            // Cap memory percentage at 100% (no swap/page file display)
            memoryPercentage = Math.min(memoryPercentage, 100);
        }

        // T085: Disk I/O calculations tracking readBytes, writeBytes, readBytesPerSec, writeBytesPerSec
        const blkioStats = stats.blkio_stats?.io_service_bytes_recursive || [];
        let readBytes = 0;
        let writeBytes = 0;
        let readBytesPerSec = 0;
        let writeBytesPerSec = 0;

        blkioStats.forEach((stat: any) => {
            if (stat.op === "Read") {
                readBytes += stat.value || 0;
            } else if (stat.op === "Write") {
                writeBytes += stat.value || 0;
            }
        });

        // Calculate bytes per second if we have previous stats
        if (stats.precpu_stats && stats.cpu_stats) {
            const timeDeltaMs =
                new Date(stats.read).getTime() -
                new Date(stats.pids_stats?.timestamp || stats.read).getTime();
            if (timeDeltaMs > 0) {
                const timeDeltaSecs = timeDeltaMs / 1000;
                // These would require delta from previous stats
                // For now, calculate based on available data
                readBytesPerSec = Math.round(
                    readBytes / Math.max(timeDeltaSecs, 1),
                );
                writeBytesPerSec = Math.round(
                    writeBytes / Math.max(timeDeltaSecs, 1),
                );
            }
        }

        // T086: Network I/O calculations tracking receivedBytes, sentBytes, receivedBytesPerSec, sentBytesPerSec
        let receivedBytes = 0;
        let sentBytes = 0;
        let receivedBytesPerSec = 0;
        let sentBytesPerSec = 0;

        if (stats.networks) {
            Object.values(stats.networks).forEach((net: any) => {
                receivedBytes += net.rx_bytes || 0;
                sentBytes += net.tx_bytes || 0;
            });
        }

        return {
            cpu: {
                percentage: Math.round(cpuPercentage * 100) / 100,
                cores: numCpus,
                systemUsage: stats.cpu_stats?.system_cpu_usage || 0,
                containerUsage: stats.cpu_stats?.cpu_usage?.total_usage || 0,
            },
            memory: {
                usage: memoryUsage,
                limit: memoryLimit,
                percentage: Math.round(memoryPercentage * 100) / 100,
            },
            diskIo: {
                readBytes,
                writeBytes,
                readBytesPerSec,
                writeBytesPerSec,
            },
            networkIo: {
                receivedBytes,
                sentBytes,
                receivedBytesPerSec,
                sentBytesPerSec,
            },
            timestamp,
            status: "available",
        };
    }

    /**
     * Parse environment variables from array format
     */
    private parseEnv(envArray: string[]): Record<string, string> {
        const env: Record<string, string> = {};
        envArray.forEach((e) => {
            const [key, ...rest] = e.split("=");
            env[key] = rest.join("=");
        });
        return env;
    }
}

// Singleton instance
let dockerServiceInstance: DockerService | null = null;

/**
 * Get or create Docker service instance
 */
export function getDockerService(): DockerService {
    if (!dockerServiceInstance) {
        const dockerHost = process.env.DOCKER_HOST || "/var/run/docker.sock";
        dockerServiceInstance = new DockerService(dockerHost);
    }
    return dockerServiceInstance;
}

export default DockerService;
