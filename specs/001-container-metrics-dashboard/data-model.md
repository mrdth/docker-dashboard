# Data Model: Docker Container Metrics Dashboard

**Feature**: 001-container-metrics-dashboard  
**Date**: 2025-11-01  
**Purpose**: Define entities, relationships, validation rules, and state transitions

---

## Entity: Container

**Purpose**: Represents a Docker container with its metadata and current state

**Type**: Core Entity  
**Uniqueness**: Identified by `id` (container ID), secondary key `name`

### Attributes

| Attribute | Type | Constraints | Notes |
|-----------|------|-------------|-------|
| `id` | string | Required, max 64 chars | Docker container ID (SHA256 hash) |
| `name` | string | Required, unique within host | Container name, may have duplicates (display ID to disambiguate) |
| `status` | enum | Required, one of: `running`, `stopped`, `paused`, `exited` | Current state from Docker API |
| `created` | ISO8601 datetime | Required | When container was created |
| `started` | ISO8601 datetime | Optional | When container was last started (null if never started) |
| `image` | string | Required | Image name/tag (e.g., "nginx:latest" or "gcr.io/project/image:v1") |
| `exitCode` | integer | Conditional | Exit code if status is `exited`, null otherwise |
| `command` | string | Optional | Container CMD/entrypoint |
| `labels` | object | Optional | Docker labels as key-value pairs |

### Validation Rules

- `id`: Must match Docker container ID format (64-char hex or shorter format)
- `name`: Alphanumeric, hyphens, underscores; no spaces or special chars
- `status`: Must be one of the four defined states
- `created` and `started`: Must be valid ISO8601 timestamps
- `exitCode`: If provided, must be integer 0-255

### Relationships

- **Container** → **ContainerMetrics** (one-to-one, real-time)
- **Container** → **Image** (many-to-one; multiple containers can use same image)
- **Container** → **Port** (one-to-many; container can expose multiple ports)
- **Container** → **LogEntry** (one-to-many; container generates many log entries)

### State Transitions

```
[Never Started]
    ↓
[Running] ← [Paused]
    ↓
[Stopped]
    ↓
[Exited] (terminal state)

Notes:
- Container can move from Running → Paused → Running (multiple times)
- Container can move from Running → Stopped (stop) or → Exited (crash)
- Stopped → Running (restart)
- Exited → Running (only if history data preserved)
```

### Example (JSON)

```json
{
  "id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "name": "nginx-prod",
  "status": "running",
  "created": "2025-11-01T10:30:00Z",
  "started": "2025-11-01T11:00:00Z",
  "image": "nginx:1.25",
  "exitCode": null,
  "command": "nginx -g 'daemon off;'",
  "labels": {
    "environment": "production",
    "team": "platform"
  }
}
```

---

## Entity: ContainerMetrics

**Purpose**: Real-time resource consumption metrics for a container

**Type**: Value Entity (ephemeral, no persistence)  
**Uniqueness**: Identified by `containerId` and `timestamp`

### Attributes

| Attribute | Type | Constraints | Notes |
|-----------|------|-------------|-------|
| `containerId` | string | Required | Foreign key to Container |
| `timestamp` | ISO8601 datetime | Required | When metrics were sampled |
| `cpu` | object | Required | CPU usage metrics |
| `cpu.percentage` | number | 0-500+ (can exceed 100% on multi-core) | CPU usage as percentage |
| `memory` | object | Required | Memory usage metrics |
| `memory.bytes` | number | ≥0 | Memory usage in bytes |
| `memory.percentage` | number | 0-100 | Memory usage as percentage of limit |
| `memoryLimit` | number | >0 | System memory limit in bytes |
| `diskIo` | object | Required | Disk I/O metrics |
| `diskIo.readBytes` | number | ≥0 | Total bytes read from disk |
| `diskIo.writeBytes` | number | ≥0 | Total bytes written to disk |
| `diskIo.readBytesPerSec` | number | ≥0 | Read throughput (bytes/sec) |
| `diskIo.writeBytesPerSec` | number | ≥0 | Write throughput (bytes/sec) |
| `networkIo` | object | Required | Network I/O metrics |
| `networkIo.receivedBytes` | number | ≥0 | Total bytes received |
| `networkIo.sentBytes` | number | ≥0 | Total bytes sent |
| `networkIo.receivedBytesPerSec` | number | ≥0 | Receive throughput (bytes/sec) |
| `networkIo.sentBytesPerSec` | number | ≥0 | Send throughput (bytes/sec) |
| `status` | enum | One of: `available`, `unavailable` | Whether metrics are valid or stale |

### CPU Percentage Special Cases & Display Examples

| Scenario | Value | Display | UI Color | Notes |
|----------|-------|---------|----------|-------|
| Single-core, idle | 0% | "0%" | Green | Minimal resource usage |
| Single-core, busy | 100% | "100%" | Red | Full core utilized |
| 4-core, 1 busy | 25% | "25%" | Green | One core working |
| 4-core, 2 busy | 50% | "50%" | Yellow | Two cores working |
| 4-core, all busy | 100% | "100%" | Red | All cores utilized |
| 4-core, overcommit | 150% | "150%" | Red | Oversubscribed, needs investigation |
| 8-core, all busy | 100% | "100%" | Red | Full utilization |

**Rendering in UI**: Values display as-is without capping or normalization. Font scaling used for larger percentages to prevent text truncation.

### Validation Rules

- `cpu.percentage`: Must be ≥0, can exceed 100% on multi-core systems
- `memory.percentage`: Must be 0-100
- All byte counts: Must be non-negative integers
- `timestamp`: Must be recent (within last 30 seconds for real-time view)
- `status`: `unavailable` indicates Docker stats API failure or timeout

### Relationships

- **ContainerMetrics** ← **Container** (many-to-one, real-time association)

### Data Lifecycle

- Metrics generated every 10 seconds from Docker stats API
- Not persisted to database (real-time only)
- Sent to frontend via WebSocket immediately upon collection
- Retained in backend buffer for fallback polling (last value only)
- Discarded when next update arrives

### Example (JSON)

```json
{
  "containerId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "timestamp": "2025-11-01T12:30:45Z",
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
```

---

## Entity: Port

**Purpose**: Represents port mappings and exposed ports for a container

**Type**: Value Entity  
**Uniqueness**: Identified by `(containerId, protocol, containerPort)`

### Attributes

| Attribute | Type | Constraints | Notes |
|-----------|------|-------------|-------|
| `containerId` | string | Required | Foreign key to Container |
| `protocol` | enum | Required, one of: `tcp`, `udp` | Transport protocol |
| `containerPort` | number | 1-65535 | Port inside container |
| `hostPort` | number | 1-65535 | Mapped port on host |
| `hostIp` | string | Optional | Host IP (e.g., "127.0.0.1" or "0.0.0.0") |

### Validation Rules

- `containerPort` and `hostPort`: Must be valid port numbers (1-65535)
- `protocol`: Case-insensitive, normalized to lowercase
- `hostIp`: Valid IP address or "0.0.0.0" (any interface) or null
- Combination (`containerId`, `protocol`, `containerPort`) must be unique

### Relationships

- **Port** ← **Container** (many-to-one)

### Example (JSON)

```json
{
  "containerId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "protocol": "tcp",
  "containerPort": 80,
  "hostPort": 8080,
  "hostIp": "127.0.0.1"
}
```

---

## Entity: LogEntry

**Purpose**: Represents a single log line from a container

**Type**: Value Entity (ephemeral)  
**Uniqueness**: Identified by `(containerId, timestamp, sequence)`

### Attributes

| Attribute | Type | Constraints | Notes |
|-----------|------|-------------|-------|
| `containerId` | string | Required | Foreign key to Container |
| `timestamp` | ISO8601 datetime | Required | When log line was generated |
| `sequence` | number | Required | Log line sequence number (for ordering) |
| `message` | string | Required, max 4096 chars | Log message content |
| `stream` | enum | One of: `stdout`, `stderr` | Whether logged to stdout or stderr |

### Validation Rules

- `message`: Must not exceed 4096 characters
- `timestamp`: Must be valid ISO8601 datetime
- `sequence`: Must be non-negative integer, monotonically increasing per container
- `stream`: Case-insensitive, normalized to lowercase

### Relationships

- **LogEntry** ← **Container** (many-to-one)

### Data Lifecycle

- Logs fetched from Docker API when container detail view opens
- Last 100 lines kept in backend buffer
- Logs older than 1 hour discarded
- Not persisted to database

### Example (JSON)

```json
{
  "containerId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "timestamp": "2025-11-01T12:30:15Z",
  "sequence": 42,
  "message": "GET /api/containers HTTP/1.1 - 200 (45ms)",
  "stream": "stdout"
}
```

---

## Entity: Image

**Purpose**: Docker image metadata with update availability information

**Type**: Reference Entity  
**Uniqueness**: Identified by `(name, tag)` or `(digest)`

### Attributes

| Attribute | Type | Constraints | Notes |
|-----------|------|-------------|-------|
| `name` | string | Required | Image repository name (e.g., "nginx", "gcr.io/project/image") |
| `tag` | string | Required | Image tag (e.g., "latest", "1.25", "sha256:abc...") |
| `digest` | string | Optional | Full image digest (SHA256) |
| `currentVersion` | string | Required | Current image version/tag |
| `latestVersion` | string | Optional | Latest available version (from registry) |
| `updateAvailable` | boolean | Optional | Whether update is available |
| `lastChecked` | ISO8601 datetime | Optional | When update check was last performed |
| `registryStatus` | enum | One of: `checked`, `unable_to_check`, `private_registry` | Status of registry availability |

### Validation Rules

- `name` and `tag`: Must match Docker image name format
- `digest`: Must be valid SHA256 hash (64 hex chars) if provided
- `currentVersion` and `latestVersion`: Must be non-empty strings
- `lastChecked`: Must be recent (within 24 hours) for `checked` status
- `updateAvailable`: True only if `latestVersion` differs from `currentVersion`

### Relationships

- **Image** ← **Container** (many-to-one; multiple containers can use same image)

### Data Lifecycle

- Update checks performed every 24 hours per image
- Docker Hub API used for public images
- Private registries marked as "unable to check"
- Last check timestamp tracked for rate limiting

### Example (JSON)

```json
{
  "name": "nginx",
  "tag": "1.25",
  "digest": "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "currentVersion": "1.25",
  "latestVersion": "1.26",
  "updateAvailable": true,
  "lastChecked": "2025-11-01T12:00:00Z",
  "registryStatus": "checked"
}
```

---

## API Request/Response Models

### Container List Request/Response

**Request**:
```
GET /api/containers?filter=status&value=running
```

**Response**:
```json
{
  "containers": [
    {
      "id": "a1b2c3d4...",
      "name": "nginx-prod",
      "status": "running",
      "created": "2025-11-01T10:30:00Z",
      "image": "nginx:1.25",
      "metrics": { /* ContainerMetrics object */ }
    }
  ],
  "error": null
}
```

### Container Detail Request/Response

**Request**:
```
GET /api/containers/{id}
```

**Response**:
```json
{
  "container": {
    /* Full Container object */
    "ports": [ /* Port[] */ ],
    "logs": [ /* LogEntry[] */ ],
    "image": { /* Image object */ }
  },
  "error": null
}
```

### Error Response

```json
{
  "error": {
    "code": "DOCKER_DAEMON_UNAVAILABLE",
    "message": "Docker daemon is not responding. Ensure Docker API is accessible.",
    "details": "Connection timeout after 5 seconds"
  }
}
```

---

## Database Schema Notes

**No persistence required for MVP**: Metrics are real-time only. Container state is queried from Docker API on each request.

**Future Enhancement** (v2): If metrics history is needed, design:
- TimeSeries table for ContainerMetrics (time-bucketed retention)
- Metrics retention policy (e.g., 7 days raw, 30 days hourly aggregates)
- Aggregation strategy (min, max, avg per time bucket)

---

## Constraints & Assumptions

1. **Docker API v1.40+**: All entities map to Docker API v1.40 endpoints and response formats
2. **Single Container Name Uniqueness**: Names are not guaranteed unique; IDs disambiguate
3. **No Persistence**: Metrics are ephemeral; restart of dashboard loses metric history
4. **100 Container Limit**: Data model not tested/optimized beyond 100 containers
5. **Real-Time Data Only**: No historical queries; all data is current state from Docker API
6. **10-Second Metric Cadence**: Metrics updated every 10 seconds; interim requests return cached value

---

## Next Steps

✅ Entity definitions complete with validation rules, relationships, and lifecycle
✅ Data model aligns with specification entities (Container, ContainerMetrics, Port, LogEntry, Image)
✅ No database schema required (real-time only)
✅ Error handling and edge cases documented

**Proceed to Phase 1b**: Generate API contracts in `/contracts/`
