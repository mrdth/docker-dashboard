# Backend - Docker Container Metrics Dashboard

Express.js backend server providing real-time Docker container metrics via REST API and WebSocket.

## Project Structure

```
backend/
├── src/
│   ├── main.ts                 # Express app entry point
│   ├── models/
│   │   ├── index.ts           # TypeScript interfaces (Container, Metrics, etc)
│   │   └── errors.ts          # Custom error classes
│   ├── services/
│   │   ├── docker.service.ts  # Docker API integration using dockerode
│   │   ├── registry.service.ts # Docker Hub API integration for image updates
│   │   └── update-checker.ts  # Background job for checking image updates
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── cors.ts        # CORS middleware
│   │   │   ├── error-handler.ts # Global error handling
│   │   │   └── request-logger.ts # Request logging
│   │   └── routes/
│   │       └── containers.ts  # Container API endpoints
│   ├── websocket/
│   │   ├── manager.ts         # WebSocket client management
│   │   ├── handlers.ts        # Message handlers
│   │   ├── message-types.ts   # WebSocket message type definitions
│   │   └── routes.ts          # WebSocket route
│   └── logger/
│       ├── index.ts           # Winston logger configuration
│       └── types.ts           # Logger type definitions
├── tests/
│   ├── contract/              # API contract tests
│   ├── integration/           # Docker integration tests
│   └── unit/                  # Service unit tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── .env                       # Environment variables
```

## Setup

### Install Dependencies

```bash
cd backend
npm install
```

### Configure Environment

Copy `.env` template and configure:

```bash
# .env
DOCKER_HOST=/var/run/docker.sock  # Docker socket path (default for Linux)
NODE_ENV=development               # dev/production
LOG_LEVEL=debug                    # debug/info/warn/error
PORT=3000                          # Backend server port
FRONTEND_URL=http://localhost:5173 # Frontend origin for CORS
```

### Run Development Server

```bash
npm run dev
```

Server starts on port 3000 (http://localhost:3000)

### Build for Production

```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/` directory.

## API Endpoints

### REST API

All endpoints return JSON with optional `error` field for errors.

#### Get All Containers

```http
GET /api/containers?name=nginx&status=running
```

**Query Parameters**:
- `name` (optional): Filter by container name (substring, case-insensitive)
- `status` (optional): Filter by status (running/stopped/paused/exited)

**Response**:

```json
{
  "containers": [
    {
      "id": "abc123def456...",
      "fullId": "abc123def456...",
      "name": "web-server",
      "status": "running",
      "image": "nginx:latest",
      "imageId": "sha256:abcd1234...",
      "created": 1698765432,
      "metrics": {
        "cpu": { "percentage": 5.25 },
        "memory": { "usage": 52428800, "limit": 1073741824, "percentage": 4.88 },
        "diskIo": { "readBytes": 1048576, "writeBytes": 2097152 },
        "networkIo": { "receivedBytes": 10485760, "sentBytes": 5242880 }
      },
      "ports": [
        { "protocol": "tcp", "containerPort": 80, "hostPort": 8080, "hostIp": "127.0.0.1" }
      ],
      "logs": [
        { "timestamp": "2024-11-03T10:30:45Z", "message": "GET /api/health HTTP/1.1\" 200", "stream": "stdout" }
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

#### Get Container Details

```http
GET /api/containers/{id}
```

**Response**: Single container object with full metrics, ports, and logs.

### WebSocket API

Connect to `ws://localhost:3000/api/metrics/stream`

#### Message Types

**Client → Server**:

```json
{ "type": "ready" }
```

Request initial container list and start receiving updates.

```json
{ "type": "get_containers" }
```

Request current container list.

```json
{ "type": "pong" }
```

Respond to server ping for keep-alive.

**Server → Client**:

```json
{
  "type": "container_list",
  "data": { "containers": [...] },
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

Current list of all containers.

```json
{
  "type": "metrics_update",
  "data": {
    "containerId": "abc123...",
    "metrics": { "cpu": {...}, "memory": {...} }
  },
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

Metrics update for a running container (throttled to max 1/sec per container).

```json
{
  "type": "container_status_changed",
  "data": {
    "containerId": "abc123...",
    "status": "stopped",
    "timestamp": "2024-11-03T10:30:45.123Z"
  },
  "timestamp": "2024-11-03T10:30:45.123Z"
}
```

Container status changed (running/stopped/paused/exited).

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

Error message.

```json
{ "type": "ping", "timestamp": "2024-11-03T10:30:45.123Z" }
```

Server ping for keep-alive (respond with `pong`).

## Running Tests

### All Tests

```bash
npm run test
```

### By Type

```bash
npm run test:contract      # API contract tests
npm run test:integration   # Docker integration tests
npm run test:unit          # Service unit tests
```

### Watch Mode

```bash
npm run test:watch
```

Re-runs tests on file changes.

### Coverage Report

```bash
npm run test -- --coverage
```

Generates coverage report in `coverage/` directory.

## Docker Service (`docker.service.ts`)

Core service wrapping dockerode library.

### Methods

- `listContainers()` → `Container[]` - All containers with normalized status
- `getContainer(id: string)` → `Container` - Single container details
- `getContainerStats(id: string)` → `Metrics` - Real-time resource metrics
- `getPorts(id: string)` → `Port[]` - Port mappings
- `getLogs(id: string)` → `LogEntry[]` - Last 100 lines of logs
- `getImageInfo(imageName: string)` → `Image` - Image details with update availability
- `verifyVersion()` - Verify Docker API v1.40+

### Error Handling

Custom error classes for graceful degradation:

- `DockerDaemonError` - Docker not available (return 503)
- `ContainerNotFoundError` - Container doesn't exist (return 404)
- `MetricsUnavailableError` - Metrics not ready (return 503 with retry hint)

## Registry Service (`registry.service.ts`)

Checks Docker Hub for image updates.

- Caches checks with 24-hour TTL
- Detects private registries (gcr.io, quay.io, etc) and returns "unable_to_check"
- Gracefully handles Docker Hub unavailability

## Logging

Winston logger with context tracking:

```typescript
log("info", "Server started", {
  service: "main",
  operation: "startServer",
  port: 3000,
});
```

**Levels**: debug, info, warn, error

**Output**: Console (dev), JSON (production)

## Performance

- Metrics collection interval: 10 seconds
- Metrics broadcast throttling: Max 1 per second per container
- WebSocket ping/pong keep-alive: Every 30 seconds
- Image update check cache: 24 hours per image

## Health Check

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "docker": "ok", "timestamp": "2024-11-03T10:30:45.123Z" }
```

Returns 200 if healthy, 503 if Docker unavailable.

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/ .
RUN npm ci --only=production
CMD ["npm", "start"]
```

Mount Docker socket:

```bash
docker run -v /var/run/docker.sock:/var/run/docker.sock \
  -p 3000:3000 \
  docker-dashboard-backend
```

### Environment Variables (Production)

```bash
NODE_ENV=production
LOG_LEVEL=info
DOCKER_HOST=/var/run/docker.sock
PORT=3000
FRONTEND_URL=https://your-domain.com
```

## Troubleshooting

**Docker daemon unavailable**: Verify Docker socket path in `.env` and Docker daemon running.

**Metrics collection failing**: Check Docker API permissions and logs with `LOG_LEVEL=debug`.

**High memory usage**: Monitor container count; metrics collection runs every 10 seconds.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development workflow.
