# WebSocket Protocol Specification

**Feature**: Docker Container Metrics Dashboard  
**Date**: 2025-11-01  
**Purpose**: Define real-time message protocol for WebSocket communication between backend and frontend

---

## Connection

### Endpoint
```
ws://localhost:3000/api/metrics/stream
ws://localhost:3000/api/metrics/stream (HTTP fallback: /api/metrics/stream?transport=sse)
```

### Connection Handshake

**Client connects to WebSocket endpoint**

```javascript
// Frontend
const ws = new WebSocket('ws://localhost:3000/api/metrics/stream');

ws.onopen = () => {
  // Send ready message
  ws.send(JSON.stringify({
    type: 'ready',
    clientId: 'unique-client-id'
  }));
};
```

**Server responds**

```json
{
  "type": "connection_established",
  "serverId": "unique-server-id",
  "timestamp": "2025-11-01T12:00:00Z"
}
```

### Connection Closure

**Graceful closure**: Client sends `close` message
```json
{
  "type": "close",
  "reason": "user_logout"
}
```

**Automatic reconnection**: Frontend implements exponential backoff (1s, 2s, 4s, 8s, max 30s)

---

## Message Types

### 1. Metrics Update (Server → Client)

**Frequency**: Every 10 seconds (or when Docker daemon becomes available/unavailable)

**Message**:
```json
{
  "type": "metrics_update",
  "timestamp": "2025-11-01T12:00:10Z",
  "data": {
    "containerId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "metrics": {
      "cpu": {
        "percentage": 25.5
      },
      "memory": {
        "bytes": 536870912,
        "percentage": 50.0
      },
      "memoryLimit": 1073741824,
      "diskIo": {
        "readBytes": 10485760,
        "writeBytes": 5242880,
        "readBytesPerSec": 102400,
        "writeBytesPerSec": 51200
      },
      "networkIo": {
        "receivedBytes": 1048576000,
        "sentBytes": 524288000,
        "receivedBytesPerSec": 1024000,
        "sentBytesPerSec": 512000
      },
      "status": "available"
    }
  }
}
```

**Frontend handling**:
- Update ContainerMetrics state for given `containerId`
- Trigger UI re-render showing latest metrics
- Clear any "unavailable" error banner

---

### 2. Container Status Change (Server → Client)

**Frequency**: When container state changes (start, stop, pause, crash)

**Message**:
```json
{
  "type": "container_status_changed",
  "timestamp": "2025-11-01T12:00:15Z",
  "data": {
    "containerId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "status": "running",
    "created": "2025-11-01T10:30:00Z",
    "started": "2025-11-01T12:00:00Z"
  }
}
```

**Frontend handling**:
- Update Container.status in state
- Update ContainerList display
- Notify user if previously stopped container started

---

### 3. Connection Health Check (Server → Client)

**Frequency**: Every 30 seconds (keep-alive)

**Message**:
```json
{
  "type": "ping",
  "timestamp": "2025-11-01T12:00:30Z",
  "id": "ping-unique-id"
}
```

**Frontend response**:
```json
{
  "type": "pong",
  "timestamp": "2025-11-01T12:00:30Z",
  "id": "ping-unique-id"
}
```

---

### 4. Metrics Unavailable (Server → Client)

**Frequency**: When Docker stats API fails or times out

**Message**:
```json
{
  "type": "metrics_unavailable",
  "timestamp": "2025-11-01T12:00:45Z",
  "data": {
    "error": {
      "code": "DOCKER_STATS_TIMEOUT",
      "message": "Docker stats API did not respond within 5 seconds",
      "retryAfter": 5000
    }
  }
}
```

**Frontend handling**:
- Show error banner: "Metrics temporarily unavailable"
- Set all metrics to status "unavailable"
- Display last known values with "stale" indicator
- Automatically retry connection (handled by auto-reconnect logic)

---

### 5. Docker Daemon Offline (Server → Client)

**Frequency**: When Docker daemon becomes unavailable

**Message**:
```json
{
  "type": "docker_daemon_offline",
  "timestamp": "2025-11-01T12:01:00Z",
  "data": {
    "error": {
      "code": "DOCKER_DAEMON_UNAVAILABLE",
      "message": "Docker daemon is not responding. Ensure Docker API is accessible.",
      "retryAfter": 10000
    }
  }
}
```

**Frontend handling**:
- Show error banner: "Docker daemon offline"
- Disable container action buttons
- Attempt server reconnection every 10 seconds (auto-retry)
- Clear metrics for all containers

---

### 6. Request Container List (Client → Server)

**Frequency**: On demand (user opens dashboard, applies filter)

**Message**:
```json
{
  "type": "get_containers",
  "id": "req-unique-id",
  "data": {
    "filters": {
      "status": "running",
      "name": "nginx"
    }
  }
}
```

**Server response**:
```json
{
  "type": "container_list",
  "id": "req-unique-id",
  "timestamp": "2025-11-01T12:00:10Z",
  "data": {
    "containers": [
      {
        "id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "name": "nginx-prod",
        "status": "running",
        "created": "2025-11-01T10:30:00Z",
        "started": "2025-11-01T11:00:00Z",
        "image": "nginx:1.25",
        "metrics": { /* latest metrics */ }
      }
    ],
    "error": null
  }
}
```

---

### 7. Request Container Details (Client → Server)

**Frequency**: When user clicks to view container detail page

**Message**:
```json
{
  "type": "get_container_detail",
  "id": "req-unique-id",
  "data": {
    "containerId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  }
}
```

**Server response**:
```json
{
  "type": "container_detail",
  "id": "req-unique-id",
  "timestamp": "2025-11-01T12:00:10Z",
  "data": {
    "container": {
      "id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "name": "nginx-prod",
      "status": "running",
      "created": "2025-11-01T10:30:00Z",
      "started": "2025-11-01T11:00:00Z",
      "image": "nginx:1.25",
      "metrics": { /* latest metrics */ },
      "ports": [
        {
          "protocol": "tcp",
          "containerPort": 80,
          "hostPort": 8080,
          "hostIp": "127.0.0.1"
        }
      ],
      "logs": [
        {
          "timestamp": "2025-11-01T12:00:00Z",
          "sequence": 42,
          "message": "GET /api/containers HTTP/1.1 - 200 (45ms)",
          "stream": "stdout"
        }
      ],
      "imageInfo": {
        "name": "nginx",
        "tag": "1.25",
        "currentVersion": "1.25",
        "latestVersion": "1.26",
        "updateAvailable": true,
        "lastChecked": "2025-11-01T12:00:00Z",
        "registryStatus": "checked"
      }
    },
    "error": null
  }
}
```

---

### 8. Error Response (Server → Client)

**For any request-response message**:

If server encounters an error processing a client request:

```json
{
  "type": "error",
  "id": "req-unique-id",
  "timestamp": "2025-11-01T12:00:10Z",
  "data": {
    "code": "INVALID_CONTAINER_ID",
    "message": "Container not found",
    "details": "Container ID 'invalid-id' does not exist"
  }
}
```

**Frontend handling**:
- Match error response to original request by `id`
- Display user-friendly error message
- Log error details for debugging

---

## Fallback: Server-Sent Events (SSE)

If WebSocket is unavailable (firewall, proxy):

### Endpoint
```
GET /api/metrics/stream?transport=sse
```

### Message Format

Messages sent as `data:` lines (SSE format):

```
data: {"type":"metrics_update","timestamp":"2025-11-01T12:00:10Z","data":{...}}
data: {"type":"ping","timestamp":"2025-11-01T12:00:30Z","id":"ping-123"}
```

### Client-to-Server Communication

SSE is unidirectional; client requests (get_containers, get_container_detail) use standard REST API calls:

```
POST /api/containers/list
POST /api/containers/{id}/detail
```

---

## Reconnection Logic

### Automatic Reconnection (Client-side)

```javascript
const maxRetries = 5;
const baseDelay = 1000; // 1 second
let retryCount = 0;

function reconnect() {
  if (retryCount >= maxRetries) {
    console.error('Max reconnection attempts reached');
    showErrorBanner('Unable to connect to server');
    return;
  }

  const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
  retryCount++;
  
  setTimeout(() => {
    try {
      ws = new WebSocket('ws://localhost:3000/api/metrics/stream');
      ws.onopen = () => { retryCount = 0; };
      ws.onerror = () => { reconnect(); };
      ws.onclose = () => { reconnect(); };
    } catch (e) {
      reconnect();
    }
  }, delay);
}
```

### Server-side Keep-Alive

Server sends `ping` every 30 seconds; if client doesn't `pong` within 10 seconds, connection is closed.

---

## Message Contract Testing

### Test Case 1: Metrics Update Flow

```javascript
test('should update metrics when server sends metrics_update', async () => {
  const ws = new WebSocket('ws://localhost:3000/api/metrics/stream');
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    expect(message.type).toBe('metrics_update');
    expect(message.data.metrics).toHaveProperty('cpu');
    expect(message.data.metrics.cpu.percentage).toBeGreaterThanOrEqual(0);
  };
});
```

### Test Case 2: Connection Recovery

```javascript
test('should reconnect when connection drops', async () => {
  const ws = new WebSocket('ws://localhost:3000/api/metrics/stream');
  
  ws.onopen = () => {
    ws.close(); // Simulate disconnect
  };
  
  ws.onclose = () => {
    // Verify reconnection logic triggered
    expect(reconnectAttempted).toBe(true);
  };
});
```

### Test Case 3: Docker Daemon Offline

```javascript
test('should notify frontend when Docker daemon goes offline', async () => {
  const ws = new WebSocket('ws://localhost:3000/api/metrics/stream');
  
  // Simulate Docker daemon becoming unavailable
  stopDockerDaemon();
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    expect(message.type).toBe('docker_daemon_offline');
    expect(message.data.error.code).toBe('DOCKER_DAEMON_UNAVAILABLE');
  };
});
```

---

## Summary

| Message Type | Direction | Frequency | Purpose |
|--------------|-----------|-----------|---------|
| connection_established | S→C | Once | Handshake response |
| metrics_update | S→C | Every 10s | Real-time metrics |
| container_status_changed | S→C | On change | Container state updates |
| ping | S→C | Every 30s | Keep-alive |
| pong | C→S | On ping | Keep-alive response |
| metrics_unavailable | S→C | On failure | Metrics collection error |
| docker_daemon_offline | S→C | On failure | Docker daemon offline |
| get_containers | C→S | On demand | Request container list |
| container_list | S→C | On request | Response with containers |
| get_container_detail | C→S | On demand | Request container detail |
| container_detail | S→C | On request | Response with detail |
| error | S→C | On error | Generic error response |
| close | C→S | On disconnect | Graceful closure |

---

## Next Steps

✅ REST API contract (OpenAPI) defined  
✅ WebSocket protocol contract defined  
✅ Message formats and error handling specified  
✅ Reconnection and fallback strategies documented  
✅ Contract test cases provided  

**Proceed to Phase 1c**: Generate quickstart.md
