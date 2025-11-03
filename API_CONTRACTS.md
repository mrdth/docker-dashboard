# API Contracts - Docker Container Metrics Dashboard

Complete specification of all REST and WebSocket endpoints.

## REST API

### Base URL

Development: `http://localhost:3000`  
Production: Configured via environment

### Common Response Format

All responses include optional `error` field:

```json
{
  "data": { /* endpoint-specific */ },
  "error": null
}
```

Error responses include `error` field with `code` and `reason`.

## Endpoints

### Health Check

**GET** `/health`

Check server health and Docker daemon status.

**Response** (200 OK):

```json
{
  "status": "ok",
  "docker": "ok",
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

**Response** (503 Service Unavailable):

```json
{
  "status": "error",
  "docker": "error",
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

**Usage**:

```bash
curl http://localhost:3000/health
```

---

### List Containers

**GET** `/api/containers`

Get all containers with optional filtering.

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Filter by container name (substring, case-insensitive) |
| `status` | string | Filter by status (running/stopped/paused/exited) |

**Response** (200 OK):

```json
{
  "containers": [
    {
      "id": "abc123def456",
      "fullId": "abc123def456789...",
      "name": "web-server",
      "status": "running",
      "image": "nginx:latest",
      "imageId": "sha256:abcd1234...",
      "created": 1698765432,
      "metrics": {
        "cpu": { "percentage": 5.25 },
        "memory": {
          "usage": 52428800,
          "limit": 1073741824,
          "percentage": 4.88
        },
        "diskIo": {
          "readBytes": 1048576,
          "writeBytes": 2097152,
          "readBytesPerSec": 0,
          "writeBytesPerSec": 0
        },
        "networkIo": {
          "receivedBytes": 10485760,
          "sentBytes": 5242880,
          "receivedBytesPerSec": 0,
          "sentBytesPerSec": 0
        }
      },
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
          "timestamp": "2024-11-03T10:30:45Z",
          "message": "GET /api/health HTTP/1.1\" 200",
          "stream": "stdout"
        }
      ],
      "imageInfo": {
        "updateAvailable": false,
        "latestVersion": "1.25.3",
        "currentVersion": "1.25.3",
        "registryStatus": "checked",
        "lastChecked": "2024-11-03T09:30:00Z"
      }
    }
  ],
  "error": null
}
```

**Response** (503 Service Unavailable - Docker unavailable):

```json
{
  "error": {
    "code": "DOCKER_DAEMON_UNAVAILABLE",
    "reason": "Docker daemon is not available"
  }
}
```

**Examples**:

```bash
# Get all containers
curl http://localhost:3000/api/containers

# Filter by name
curl 'http://localhost:3000/api/containers?name=nginx'

# Filter by status
curl 'http://localhost:3000/api/containers?status=running'

# Combined filters
curl 'http://localhost:3000/api/containers?name=web&status=running'
```

---

### Get Container Details

**GET** `/api/containers/{id}`

Get full details for a single container including metrics, ports, and logs.

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `id` | string | Container ID (short or full) |

**Response** (200 OK):

```json
{
  "container": {
    "id": "abc123def456",
    "fullId": "abc123def456789...",
    "name": "web-server",
    "status": "running",
    "image": "nginx:latest",
    "imageId": "sha256:abcd1234...",
    "created": 1698765432,
    "metrics": { /* see List Containers */ },
    "ports": [ /* see List Containers */ ],
    "logs": [ /* see List Containers */ ],
    "imageInfo": { /* see List Containers */ }
  },
  "error": null
}
```

**Response** (404 Not Found):

```json
{
  "error": {
    "code": "CONTAINER_NOT_FOUND",
    "reason": "Container not found"
  }
}
```

**Response** (503 Service Unavailable):

```json
{
  "error": {
    "code": "DOCKER_DAEMON_UNAVAILABLE",
    "reason": "Docker daemon is not available"
  }
}
```

**Example**:

```bash
curl http://localhost:3000/api/containers/abc123def456
```

---

## WebSocket API

### Connection

**URL**: `ws://localhost:3000/api/metrics/stream`

```javascript
const ws = new WebSocket('ws://localhost:3000/api/metrics/stream')

ws.onopen = () => {
  // Ready to send/receive messages
  ws.send(JSON.stringify({ type: 'ready' }))
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log(message)
}

ws.onerror = (error) => {
  console.error('WebSocket error:', error)
}

ws.onclose = () => {
  // Connection closed, implement reconnection logic
}
```

### Message Format

**General Format**:

```json
{
  "type": "message_type",
  "data": { /* message-specific */ },
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

### Client → Server Messages

#### ready

Signal that client is ready to receive updates. Request initial container list.

```json
{
  "type": "ready"
}
```

**Server Response**: `container_list` message with all containers.

#### get_containers

Request current container list.

```json
{
  "type": "get_containers"
}
```

**Server Response**: `container_list` message.

#### pong

Respond to server ping for keep-alive.

```json
{
  "type": "pong"
}
```

#### Example Client Code

```javascript
const ws = new WebSocket('ws://localhost:3000/api/metrics/stream')

ws.onopen = () => {
  // Signal ready
  ws.send(JSON.stringify({ type: 'ready' }))
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)

  if (msg.type === 'ping') {
    // Respond to keep-alive
    ws.send(JSON.stringify({ type: 'pong' }))
  }
}
```

### Server → Client Messages

#### container_list

Full list of all containers.

**Sent on**:
- Client sends `ready` message
- Client sends `get_containers` message
- Container list changes (added/removed/status changed)

**Format**:

```json
{
  "type": "container_list",
  "data": {
    "containers": [
      {
        "id": "abc123...",
        "fullId": "abc123...",
        "name": "web-server",
        "status": "running",
        "image": "nginx:latest",
        "imageId": "sha256:...",
        "created": 1698765432,
        "metrics": { /* optional if not yet collected */ },
        "ports": [],
        "logs": [],
        "imageInfo": {}
      }
    ]
  },
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

#### metrics_update

Resource metrics for a container.

**Sent on**: Every 10 seconds for running containers (throttled to max 1/sec per container)

**Format**:

```json
{
  "type": "metrics_update",
  "data": {
    "containerId": "abc123def456",
    "metrics": {
      "cpu": { "percentage": 5.25 },
      "memory": {
        "usage": 52428800,
        "limit": 1073741824,
        "percentage": 4.88
      },
      "diskIo": {
        "readBytes": 1048576,
        "writeBytes": 2097152,
        "readBytesPerSec": 1024,
        "writeBytesPerSec": 2048
      },
      "networkIo": {
        "receivedBytes": 10485760,
        "sentBytes": 5242880,
        "receivedBytesPerSec": 512,
        "sentBytesPerSec": 256
      }
    }
  },
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

#### container_status_changed

Container status change notification.

**Sent on**: When container status changes (running → stopped, etc.)

**Format**:

```json
{
  "type": "container_status_changed",
  "data": {
    "containerId": "abc123def456",
    "status": "stopped",
    "timestamp": "2024-11-03T10:30:45.123Z"
  },
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

#### ping

Keep-alive ping from server.

**Sent on**: Every 30 seconds

**Format**:

```json
{
  "type": "ping",
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

**Client must respond** with `pong` message.

#### error

Error message.

**Sent on**: Connection failures, API errors, internal errors

**Format**:

```json
{
  "type": "error",
  "data": {
    "code": "DOCKER_DAEMON_UNAVAILABLE",
    "reason": "Docker daemon is not available"
  },
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

**Common Error Codes**:

- `DOCKER_DAEMON_UNAVAILABLE` - Docker daemon not running
- `METRICS_COLLECTION_ERROR` - Failed to collect metrics
- `CONNECTION_ERROR` - WebSocket connection error
- `INTERNAL_ERROR` - Server internal error

### WebSocket Example: Full Client

```javascript
class DashboardWebSocket {
  constructor(url = 'ws://localhost:3000/api/metrics/stream') {
    this.url = url
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.setupPingTimeout()
          this.ws.send(JSON.stringify({ type: 'ready' }))
          resolve()
        }

        this.ws.onmessage = (event) => {
          const msg = JSON.parse(event.data)
          this.handleMessage(msg)
        }

        this.ws.onerror = (error) => {
          reject(error)
        }

        this.ws.onclose = () => {
          this.attemptReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'ping':
        this.ws.send(JSON.stringify({ type: 'pong' }))
        break

      case 'container_list':
        this.onContainerList?.(msg.data.containers)
        break

      case 'metrics_update':
        this.onMetricsUpdate?.(msg.data)
        break

      case 'container_status_changed':
        this.onStatusChanged?.(msg.data)
        break

      case 'error':
        this.onError?.(msg.data)
        break
    }
  }

  setupPingTimeout() {
    if (this.pingTimeout) clearTimeout(this.pingTimeout)
    this.pingTimeout = setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.disconnect()
        this.attemptReconnect()
      }
    }, 60000) // 2x ping interval
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onError?.({ code: 'MAX_RECONNECT_ATTEMPTS' })
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++

    setTimeout(() => this.connect().catch(err => {
      console.error('Reconnect failed:', err)
      this.attemptReconnect()
    }), delay)
  }

  disconnect() {
    if (this.pingTimeout) clearTimeout(this.pingTimeout)
    if (this.ws) this.ws.close()
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }
}

// Usage
const ws = new DashboardWebSocket()

ws.onContainerList = (containers) => {
  console.log('Received containers:', containers)
}

ws.onMetricsUpdate = ({ containerId, metrics }) => {
  console.log(`Metrics for ${containerId}:`, metrics)
}

ws.onError = (error) => {
  console.error('WebSocket error:', error)
}

ws.connect()
  .then(() => console.log('Connected'))
  .catch(err => console.error('Connection failed:', err))
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid query parameters) |
| 404 | Not found (container doesn't exist) |
| 503 | Service unavailable (Docker daemon down) |

## Rate Limiting

No rate limiting implemented. Production deployments should add rate limiting (e.g., 100 requests/min per IP).

## CORS

Frontend origin is configured via `FRONTEND_URL` environment variable. Only requests from this origin are allowed.

**Default**: `http://localhost:5173` (development)

## Authentication

No authentication implemented. Dashboard is intended for trusted networks only.

## Performance Notes

- Metrics collection: 10 second interval
- Metrics broadcast throttling: Max 1 per second per container
- WebSocket keep-alive: 30 second ping interval
- Image update check cache: 24 hours per image
