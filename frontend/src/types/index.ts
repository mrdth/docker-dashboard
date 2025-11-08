/**
 * TypeScript interfaces for frontend
 * Matches backend models
 */

export interface Port {
    protocol: string;
    containerPort: number;
    hostPort?: number;
    hostIp?: string;
}

export interface ContainerMetrics {
    cpu: {
        percentage: number;
        cores: number;
        systemUsage: number;
        containerUsage: number;
    };
    memory: {
        usage: number;
        limit: number;
        percentage: number;
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
    timestamp: string;
    status: "available" | "unavailable";
}

export interface ImageInfo {
    name: string;
    tag: string;
    id: string;
    created: string;
    size?: number;
    updateAvailable?: boolean;
    latestVersion?: string;
    lastChecked?: string;
    registryStatus: "checked" | "unable_to_check" | "checking";
}

export interface LogEntry {
    timestamp: string;
    message: string;
    stream: "stdout" | "stderr";
    sequence?: number;
}

export type ContainerStatus = "running" | "stopped" | "paused" | "exited";

export interface Container {
    id: string;
    fullId: string;
    name: string;
    status: ContainerStatus;
    image: string;
    imageInfo?: ImageInfo;
    created: string;
    started?: string;
    ports: Port[];
    metrics?: ContainerMetrics;
    logs?: LogEntry[];
    labels?: Record<string, string>;
    command?: string;
    env?: Record<string, string>;
}

export interface WebSocketMessage {
    type: string;
    data?: any;
    timestamp?: string;
    error?: string;
}

export interface ImageInfoUpdateMessage extends WebSocketMessage {
    type: "imageinfo_update";
    data?: {
        containerId: string;
        imageInfo: ImageInfo;
    };
}

export interface ErrorMessage extends WebSocketMessage {
    type: "error";
    data?: {
        code?: string;
        reason?: string;
    };
}
