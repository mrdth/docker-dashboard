/**
 * WebSocket message type definitions
 */

import { Container, ContainerMetrics, ImageInfo } from "../models/index";

export type WebSocketMessageType =
    | "ready"
    | "ping"
    | "pong"
    | "get_containers"
    | "container_list"
    | "get_container_detail"
    | "container_detail"
    | "metrics_update"
    | "container_status_changed"
    | "imageinfo_update"
    | "error"
    | "close";

export interface WebSocketMessage {
    type: WebSocketMessageType;
    data?: any;
    timestamp?: string;
    error?: string;
}

// Client to Server messages

export interface ReadyMessage extends WebSocketMessage {
    type: "ready";
    data?: {
        clientVersion?: string;
    };
}

export interface PingMessage extends WebSocketMessage {
    type: "ping";
}

export interface PongMessage extends WebSocketMessage {
    type: "pong";
}

export interface GetContainersMessage extends WebSocketMessage {
    type: "get_containers";
}

export interface GetContainerDetailMessage extends WebSocketMessage {
    type: "get_container_detail";
    data: {
        containerId: string;
    };
}

export interface CloseMessage extends WebSocketMessage {
    type: "close";
    data?: {
        reason?: string;
    };
}

// Server to Client messages

export interface ContainerListMessage extends WebSocketMessage {
    type: "container_list";
    data: {
        containers: Container[];
    };
}

export interface ContainerDetailMessage extends WebSocketMessage {
    type: "container_detail";
    data: {
        container: Container;
    };
}

export interface MetricsUpdateMessage extends WebSocketMessage {
    type: "metrics_update";
    data: {
        containerId: string;
        metrics: ContainerMetrics;
    };
}

export interface ContainerStatusChangedMessage extends WebSocketMessage {
    type: "container_status_changed";
    data: {
        containerId: string;
        status: string;
        timestamp: string;
    };
}

export interface ImageInfoUpdateMessage extends WebSocketMessage {
    type: "imageinfo_update";
    data: {
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

// Type union for all messages
export type AnyWebSocketMessage =
    | ReadyMessage
    | PingMessage
    | PongMessage
    | GetContainersMessage
    | GetContainerDetailMessage
    | CloseMessage
    | ContainerListMessage
    | ContainerDetailMessage
    | MetricsUpdateMessage
    | ContainerStatusChangedMessage
    | ImageInfoUpdateMessage
    | ErrorMessage;

/**
 * Type guard functions
 */
export function isReadyMessage(msg: WebSocketMessage): msg is ReadyMessage {
    return msg.type === "ready";
}

export function isPingMessage(msg: WebSocketMessage): msg is PingMessage {
    return msg.type === "ping";
}

export function isPongMessage(msg: WebSocketMessage): msg is PongMessage {
    return msg.type === "pong";
}

export function isGetContainersMessage(
    msg: WebSocketMessage,
): msg is GetContainersMessage {
    return msg.type === "get_containers";
}

export function isContainerListMessage(
    msg: WebSocketMessage,
): msg is ContainerListMessage {
    return msg.type === "container_list";
}

export function isMetricsUpdateMessage(
    msg: WebSocketMessage,
): msg is MetricsUpdateMessage {
    return msg.type === "metrics_update";
}

export function isImageInfoUpdateMessage(
    msg: WebSocketMessage,
): msg is ImageInfoUpdateMessage {
    return msg.type === "imageinfo_update";
}

export function isErrorMessage(msg: WebSocketMessage): msg is ErrorMessage {
    return msg.type === "error";
}
