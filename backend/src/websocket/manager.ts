/**
 * WebSocket connection manager
 * Manages connected clients, broadcasts messages, and handles reconnection
 */

import { WebSocket } from 'express-ws';
import { getDockerService } from '../services/docker.service';
import { getLogger } from '../logger/index';
import {
  WebSocketMessage,
  ContainerListMessage,
  MetricsUpdateMessage,
  ContainerStatusChangedMessage,
  ErrorMessage
} from './message-types';
import { Container } from '../models/index';

const logger = getLogger();

interface ClientConnection {
  ws: WebSocket;
  id: string;
  connectedAt: Date;
  lastPongAt: Date;
  pingTimeout?: NodeJS.Timeout;
}

export class WebSocketManager {
  private clients: Map<string, ClientConnection> = new Map();
  private metricsInterval?: NodeJS.Timeout;
  private lastContainerStates: Map<string, string> = new Map();
  private dockerService = getDockerService();

  /**
   * Register a new WebSocket client
   */
  registerClient(ws: WebSocket): string {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const client: ClientConnection = {
      ws,
      id: clientId,
      connectedAt: new Date(),
      lastPongAt: new Date()
    };

    this.clients.set(clientId, client);

    logger.info('WebSocket client connected', {
      service: 'websocket',
      operation: 'registerClient',
      clientId,
      totalClients: this.clients.size
    });

    // Start metrics collection if this is the first client
    if (this.clients.size === 1) {
      this.startMetricsCollection();
    }

    // Set up ping/pong keep-alive
    this.setupPingPong(clientId);

    return clientId;
  }

  /**
   * Unregister a client
   */
  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);

    if (client?.pingTimeout) {
      clearTimeout(client.pingTimeout);
    }

    this.clients.delete(clientId);

    logger.info('WebSocket client disconnected', {
      service: 'websocket',
      operation: 'unregisterClient',
      clientId,
      totalClients: this.clients.size
    });

    // Stop metrics collection if no more clients
    if (this.clients.size === 0) {
      this.stopMetricsCollection();
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      try {
        client.ws.send(messageStr);
      } catch (error) {
        logger.error('Failed to send message to client', {
          service: 'websocket',
          operation: 'broadcast',
          clientId: client.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.unregisterClient(client.id);
      }
    });
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);

    if (!client) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send message to client', {
        service: 'websocket',
        operation: 'sendToClient',
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.unregisterClient(clientId);
    }
  }

  /**
   * Send error message to client
   */
  sendError(clientId: string, code: string, reason: string): void {
    const message: ErrorMessage = {
      type: 'error',
      data: { code, reason },
      timestamp: new Date().toISOString()
    };

    this.sendToClient(clientId, message);
  }

  /**
   * Broadcast container list to all clients
   */
  broadcastContainerList(containers: Container[]): void {
    const message: ContainerListMessage = {
      type: 'container_list',
      data: { containers },
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
  }

  /**
   * Broadcast metrics update for a container
   */
  broadcastMetricsUpdate(containerId: string, metrics: any): void {
    const message: MetricsUpdateMessage = {
      type: 'metrics_update',
      data: {
        containerId,
        metrics
      },
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
  }

  /**
   * Broadcast container status change
   */
  broadcastContainerStatusChanged(
    containerId: string,
    status: string
  ): void {
    const message: ContainerStatusChangedMessage = {
      type: 'container_status_changed',
      data: {
        containerId,
        status,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
  }

  /**
   * Start metrics collection loop
   */
  private startMetricsCollection(): void {
    logger.info('Starting metrics collection', {
      service: 'websocket',
      operation: 'startMetricsCollection'
    });

    // Poll containers every 10 seconds
    this.metricsInterval = setInterval(async () => {
      try {
        const containers = await this.dockerService.listContainers();

        // Check for status changes
        containers.forEach((container) => {
          const previousStatus = this.lastContainerStates.get(container.id);

          if (
            previousStatus &&
            previousStatus !== container.status
          ) {
            this.broadcastContainerStatusChanged(
              container.id,
              container.status
            );
          }

          this.lastContainerStates.set(container.id, container.status);
        });

        // Broadcast container list
        this.broadcastContainerList(containers);

        // Fetch and broadcast metrics for each running container
        for (const container of containers) {
          if (container.status === 'running') {
            try {
              const metrics = await this.dockerService.getContainerStats(
                container.fullId
              );
              this.broadcastMetricsUpdate(container.id, metrics);
            } catch (error) {
              logger.debug('Failed to get metrics for container', {
                service: 'websocket',
                operation: 'metricsCollection',
                containerId: container.id,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }
      } catch (error) {
        logger.error('Error in metrics collection', {
          service: 'websocket',
          operation: 'metricsCollection',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Broadcast error to all clients
        const errorMsg: ErrorMessage = {
          type: 'error',
          data: {
            code: 'METRICS_COLLECTION_ERROR',
            reason: 'Failed to collect metrics'
          },
          timestamp: new Date().toISOString()
        };

        this.broadcast(errorMsg);
      }
    }, 10000); // 10 second interval
  }

  /**
   * Stop metrics collection loop
   */
  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;

      logger.info('Stopped metrics collection', {
        service: 'websocket',
        operation: 'stopMetricsCollection'
      });
    }
  }

  /**
   * Set up ping/pong keep-alive for a client
   */
  private setupPingPong(clientId: string): void {
    const client = this.clients.get(clientId);

    if (!client) {
      return;
    }

    // Send ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (!this.clients.has(clientId)) {
        clearInterval(pingInterval);
        return;
      }

      const currentClient = this.clients.get(clientId);

      if (!currentClient) {
        clearInterval(pingInterval);
        return;
      }

      try {
        currentClient.ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        clearInterval(pingInterval);
        this.unregisterClient(clientId);
      }
    }, 30000);

    client.pingTimeout = pingInterval as any;
  }

  /**
   * Handle pong response from client
   */
  handlePong(clientId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      client.lastPongAt = new Date();
    }
  }

  /**
   * Get manager statistics
   */
  getStats(): {
    connectedClients: number;
    uptime: number;
  } {
    return {
      connectedClients: this.clients.size,
      uptime: Date.now()
    };
  }
}

// Singleton instance
let managerInstance: WebSocketManager | null = null;

/**
 * Get or create WebSocket manager instance
 */
export function getWebSocketManager(): WebSocketManager {
  if (!managerInstance) {
    managerInstance = new WebSocketManager();
  }
  return managerInstance;
}

export default WebSocketManager;
