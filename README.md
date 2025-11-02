# Docker Container Metrics Dashboard

A real-time, web-based dashboard for monitoring Docker containers with metrics, status tracking, port mappings, logs, and image update notifications.

## Features

### 📊 Container Monitoring
- **Real-time Container List**: View all Docker containers with live status updates
- **Status Indicators**: Visual badges for running, stopped, paused, and exited containers
- **Search & Filter**: Quickly find containers by name or filter by status

### 📈 Resource Metrics
- **CPU Usage**: Real-time CPU percentage with multi-core support (can exceed 100%)
- **Memory Usage**: Memory consumption with percentage and byte breakdown
- **Disk I/O**: Read/write bytes and per-second throughput
- **Network I/O**: Received/sent bytes and per-second throughput
- **Live Updates**: WebSocket-based real-time metric streaming (~10s updates)

### 🔍 Container Details
- **Port Mappings**: View exposed and mapped ports for each container
- **Container Logs**: Last 100 log lines with timestamps and stream indicators
- **Image Information**: Current image, tag, and update availability

### 🔄 Image Update Notifications
- **Update Checking**: Automatic checks for newer image versions on Docker Hub
- **Update Indicators**: 
  - 🟢 Green "Up to date" - Running the latest version
  - 🔵 Blue "Update available" - Newer version exists on Docker Hub
  - ⚪ Gray "Unable to check" - Private registry or unavailable
- **24-hour Cache**: Efficient update checking without overwhelming the registry
- **Background Jobs**: Automatic update checks run every 24 hours

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 5.1.0
- **WebSockets**: express-ws 5.0.2
- **Docker Integration**: dockerode 4.0.9
- **Language**: TypeScript 5.9.3
- **Logging**: Winston 3.18.3
- **Testing**: Vitest 4.0.6, Supertest 7.1.4

### Frontend
- **Framework**: Vue 3.5.13
- **Build Tool**: Vite 7.1.12
- **Styling**: Tailwind CSS 4.1.4
- **Components**: Reka UI 2.6.0
- **Language**: TypeScript 5.9.3
- **Testing**: Vitest 4.0.6, Vue Test Utils 2.4.6

### Infrastructure
- **Docker API**: v1.40+
- **Storage**: In-memory (no persistence)
- **Real-time**: WebSocket with REST fallback

## Getting Started

### Prerequisites
- Node.js 20 or later
- Docker daemon running
- Docker socket accessible at `/var/run/docker.sock` (or configure via `DOCKER_HOST`)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd docker-dashboard
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Configuration

#### Backend Environment Variables
Create `backend/.env`:
```env
DOCKER_HOST=/var/run/docker.sock
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
FRONTEND_URL=http://localhost:5173
```

#### Frontend Environment Variables
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
```

### Development

1. Start the backend server:
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

2. In another terminal, start the frontend dev server:
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

3. Open http://localhost:5173 in your browser

### Production Build

1. Build the backend (TypeScript compilation):
```bash
cd backend
npm run build
```

2. Build the frontend:
```bash
cd frontend
npm run build
npm run preview  # Preview the production build
```

## Project Structure

```
docker-dashboard/
├── backend/
│   ├── src/
│   │   ├── models/          # TypeScript interfaces and data models
│   │   ├── services/        # Docker service, Registry service, Update checker
│   │   ├── api/
│   │   │   ├── routes/      # Express route handlers
│   │   │   └── middleware/  # CORS, logging, error handling
│   │   ├── websocket/       # WebSocket handlers and management
│   │   └── logger/          # Winston logger configuration
│   ├── tests/
│   │   ├── contract/        # API contract tests
│   │   ├── integration/     # Docker integration tests
│   │   └── unit/            # Unit tests
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Vue components (UI elements)
│   │   ├── pages/           # Vue page components (routes)
│   │   ├── composables/     # Vue composition API utilities
│   │   ├── services/        # API client, WebSocket client
│   │   └── types/           # TypeScript types
│   ├── tests/
│   │   └── components/      # Component tests
│   └── package.json
│
├── specs/                   # Feature specifications and planning docs
└── README.md
```

## API Endpoints

### REST API

#### GET `/api/containers`
List all containers with optional filtering.

**Query Parameters:**
- `status` - Filter by status (running, stopped, paused, exited)
- `name` - Filter by container name (substring match, case-insensitive)

**Response:**
```json
{
  "containers": [
    {
      "id": "2525c379837b",
      "fullId": "2525c379837b43b9a33991e5fa5033a9d8cba039be315a9fec91cce57badfe57",
      "name": "nginx",
      "status": "running",
      "image": "nginx:latest",
      "created": 1762016111,
      "ports": [],
      "metrics": { /* metrics object */ },
      "imageInfo": { /* image update info */ },
      "logs": [ /* recent log lines */ ]
    }
  ],
  "error": null,
  "timestamp": "2025-11-02T19:53:29.528Z"
}
```

#### GET `/api/containers/{id}`
Get detailed information for a specific container.

**Response:** Single container object with full metrics, ports, logs, and imageInfo.

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "docker": "ok",
  "timestamp": "2025-11-02T19:53:29.528Z"
}
```

### WebSocket API

#### Connection
Connect to `ws://localhost:3000/api/metrics/stream`

#### Message Types

**client → server: ready**
```json
{ "type": "ready" }
```

**server → client: metrics_update**
```json
{
  "type": "metrics_update",
  "data": {
    "containerId": "2525c379837b",
    "metrics": { /* metrics object */ },
    "timestamp": "2025-11-02T19:53:29.528Z"
  }
}
```

**server → client: container_status_changed**
```json
{
  "type": "container_status_changed",
  "data": {
    "containerId": "2525c379837b",
    "status": "running"
  }
}
```

**server → client: error**
```json
{
  "type": "error",
  "data": {
    "code": "DOCKER_DAEMON_UNAVAILABLE",
    "reason": "Docker daemon is not available"
  }
}
```

## Testing

### Run All Tests
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### Run Specific Test Suites
```bash
# Backend contract tests
cd backend && npm run test:contract

# Backend integration tests
cd backend && npm run test:integration

# Backend unit tests
cd backend && npm run test:unit

# Frontend component tests
cd frontend && npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test -- --coverage
```

## Performance Characteristics

- **Dashboard Load Time**: < 3 seconds (50+ containers)
- **Metrics Update Latency**: < 100ms (via WebSocket)
- **Search Response Time**: < 1 second (100+ containers)
- **API Latency (p95)**: < 200ms
- **Cache TTL**: 24 hours (image update checks)
- **WebSocket Ping/Pong**: Every 30 seconds (10 second timeout)

## Architecture

### Backend Flow
1. Express server initializes and verifies Docker connectivity
2. WebSocket manager handles real-time client connections
3. Docker service wraps dockerode library and normalizes responses
4. Registry service checks Docker Hub for image updates (with caching)
5. Update checker runs background jobs every 24 hours
6. Metrics are polled and broadcast to connected clients every ~10 seconds

### Frontend Flow
1. Vue app initializes and loads container list via REST API
2. For each container, fetches detailed metrics from `/api/containers/{id}`
3. Establishes WebSocket connection for real-time updates
4. Updates container state when metrics_update or status_changed messages arrive
5. Applies filters and renders container list with current data

## Troubleshooting

### Docker daemon unavailable
- Ensure Docker is running: `docker ps`
- Check `DOCKER_HOST` environment variable is correct
- Verify socket permissions: `ls -l /var/run/docker.sock`

### WebSocket connection failing
- Check frontend is configured to correct API URL
- Verify backend port 3000 is accessible
- Check browser console for connection errors

### Image update checks not working
- Private registries (gcr.io, quay.io) will show "Unable to check"
- Docker Hub rate limits may apply (~100 requests per hour unauthenticated)
- Check backend logs for registry errors: `LOG_LEVEL=debug`

### Metrics showing N/A
- Container must be running to collect metrics
- Check container isn't just starting up
- WebSocket connection should be active (check browser Network tab)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and write tests
3. Run tests: `npm test`
4. Commit with descriptive messages: `git commit -m "feat: description"`
5. Push to your branch and create a pull request

## License

MIT License - see [LICENSE.md](LICENSE.md) for details

## Acknowledgments

- [dockerode](https://github.com/apocas/dockerode) - Docker API client
- [Express.js](https://expressjs.com/) - Web framework
- [Vue 3](https://vuejs.org/) - Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Reka UI](https://reka-ui.com/) - Accessible component library

## Support

For issues, questions, or suggestions, please open an issue in the repository.
