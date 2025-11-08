/**
 * TypeScript interfaces for Docker Container Metrics Dashboard
 * Matches data-model.md specifications
 */

export interface Port {
    protocol: string; // 'tcp' or 'udp'
    containerPort: number;
    hostPort?: number;
    hostIp?: string;
}

export interface ContainerMetrics {
    cpu: {
        percentage: number; // Can exceed 100% on multi-core systems
        cores: number;
        systemUsage: number;
        containerUsage: number;
    };
    memory: {
        usage: number; // bytes
        limit: number; // bytes
        percentage: number; // 0-100
    };
    diskIo: {
        readBytes: number;
        writeBytes: number;
        readBytesPerSec: number;
        writeBytesPerSec: number;
    };
    networkIo: {
        receivedBytes: number;
        sentBytes: number;
        receivedBytesPerSec: number;
        sentBytesPerSec: number;
    };
    timestamp: string; // ISO 8601
    status: "available" | "unavailable";
}

export interface ImageInfo {
    name: string;
    tag: string;
    id: string;
    created: string; // ISO 8601
    size?: number; // bytes
    updateAvailable?: boolean;
    latestVersion?: string;
    lastChecked?: string; // ISO 8601
    lastUpdated?: string; // ISO 8601
    registryStatus: "checked" | "unable_to_check" | "checking";
}

export interface LogEntry {
    timestamp: string; // ISO 8601
    message: string;
    stream: "stdout" | "stderr"; // Docker log stream
    sequence?: number;
}

export type ContainerStatus = "running" | "stopped" | "paused" | "exited";

export interface Container {
    id: string; // Short container ID
    fullId: string; // Full container ID hash
    name: string;
    status: ContainerStatus;
    image: string; // Image name with tag
    imageInfo?: ImageInfo;
    created: string; // ISO 8601
    started?: string; // ISO 8601, null if not running
    ports: Port[];
    metrics?: ContainerMetrics;
    logs?: LogEntry[];
    labels?: Record<string, string>;
    command?: string;
    env?: Record<string, string>;
}

export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    message?: string;
    status?: "ok" | "error";
}

export interface ContainerListResponse {
    containers: Container[];
    error?: string | null;
    timestamp: string;
}

export interface ContainerDetailResponse {
    container: Container;
    error?: string | null;
    timestamp: string;
}

export interface HealthCheckResponse {
    status: "ok" | "error";
    docker: "ok" | "error";
    timestamp: string;
    message?: string;
}
