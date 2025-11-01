# Quick Start: Docker Container Metrics Dashboard

**Feature**: 001-container-metrics-dashboard  
**Date**: 2025-11-01  
**Purpose**: Quick reference for developers implementing this feature

---

## Project Setup

### Prerequisites

- Node.js 20+
- Docker 19.03+ (Docker API v1.40+)
- npm or yarn

### Directory Structure

```
docker-dashboard/
├── backend/
│   ├── src/
│   │   ├── main.ts                 # Express app entry point
│   │   ├── models/                 # Type definitions
│   │   ├── services/               # Docker SDK integration
│   │   ├── api/                    # REST endpoints
│   │   ├── websocket/              # WebSocket handlers
│   │   └── logger/                 # Logging utility
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Root component
│   │   ├── pages/                  # Page components
│   │   ├── components/             # Reusable components
│   │   ├── services/               # API client
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── types/                  # TypeScript types
│   │   └── styles/                 # Global styles
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
└── specs/
    └── 001-container-metrics-dashboard/
        ├── spec.md                 # Feature specification
        ├── plan.md                 # This plan
        ├── research.md             # Technology decisions
        ├── data-model.md           # Entity definitions
        └── contracts/              # API contracts
```

### Backend Setup

```bash
# Create backend project
mkdir backend
cd backend
npm init -y
npm install express ws dockerode dotenv winston
npm install --save-dev typescript @types/express @types/node ts-node jest ts-jest

# Create directory structure
mkdir -p src/{models,services,api/routes,api/middleware,websocket,logger}
mkdir -p tests/{contract,integration,unit}

# Create tsconfig.json and jest.config.js
```

### Frontend Setup

```bash
# Create frontend project (from parent directory)
cd ..
npx create-react-app frontend --template typescript
cd frontend
npm install emotion @emotion/react
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

---

## Core Concepts

### 1. Docker API Integration (Backend Service)

**File**: `backend/src/services/docker.service.ts`

```typescript
import * as Docker from 'dockerode';

class DockerService {
  private docker: Docker;

  constructor(socketPath = '/var/run/docker.sock') {
    this.docker = new Docker({ socketPath });
  }

  async listContainers() {
    const containers = await this.docker.listContainers({ all: true });
    return containers.map(c => ({
      id: c.Id,
      name: c.Names[0],
      status: this.normalizeStatus(c.Status),
      created: new Date(c.Created * 1000),
      image: c.Image
    }));
  }

  async getContainerStats(containerId: string) {
    const container = this.docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });
    return this.parseStats(stats);
  }

  private normalizeStatus(dockerStatus: string): 'running' | 'stopped' | 'paused' | 'exited' {
    if (dockerStatus.includes('Up')) return 'running';
    if (dockerStatus.includes('Paused')) return 'paused';
    if (dockerStatus.includes('Exited')) return 'exited';
    return 'stopped';
  }

  private parseStats(stats: any) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

    return {
      cpu: { percentage: Math.max(0, cpuPercent) },
      memory: {
        bytes: stats.memory_stats.usage,
        percentage: (stats.memory_stats.usage / stats.memory_stats.limit) * 100
      },
      memoryLimit: stats.memory_stats.limit,
      // ... diskIo, networkIo
    };
  }
}

export default new DockerService();
```

### 2. REST API Setup (Express)

**File**: `backend/src/api/routes/containers.ts`

```typescript
import { Router } from 'express';
import dockerService from '../../services/docker.service';
import logger from '../../logger';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const containers = await dockerService.listContainers();
    res.json({ containers, error: null });
  } catch (error) {
    logger.error('Failed to list containers', error);
    res.status(503).json({
      error: {
        code: 'DOCKER_DAEMON_UNAVAILABLE',
        message: 'Docker daemon is not responding'
      }
    });
  }
});

router.get('/:containerId', async (req, res) => {
  try {
    const container = await dockerService.getContainer(req.params.containerId);
    const metrics = await dockerService.getContainerStats(req.params.containerId);
    const ports = await dockerService.getPorts(req.params.containerId);
    const logs = await dockerService.getLogs(req.params.containerId);
    
    res.json({
      container: { ...container, metrics, ports, logs },
      error: null
    });
  } catch (error) {
    res.status(404).json({
      error: {
        code: 'CONTAINER_NOT_FOUND',
        message: 'Container not found'
      }
    });
  }
});

export default router;
```

### 3. WebSocket Implementation (Real-Time Metrics)

**File**: `backend/src/websocket/manager.ts`

```typescript
import { WebSocketServer } from 'ws';
import dockerService from '../services/docker.service';

class WebSocketManager {
  private wss: WebSocketServer;
  private metricsInterval: NodeJS.Timeout;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupHandlers();
    this.startMetricsCollection();
  }

  private setupHandlers() {
    this.wss.on('connection', (ws) => {
      logger.info('WebSocket client connected');
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });
    });
  }

  private async startMetricsCollection() {
    this.metricsInterval = setInterval(async () => {
      try {
        const containers = await dockerService.listContainers();
        
        for (const container of containers) {
          const metrics = await dockerService.getContainerStats(container.id);
          
          this.broadcast({
            type: 'metrics_update',
            timestamp: new Date().toISOString(),
            data: {
              containerId: container.id,
              metrics
            }
          });
        }
      } catch (error) {
        this.broadcast({
          type: 'docker_daemon_offline',
          timestamp: new Date().toISOString(),
          data: { error: { code: 'DOCKER_DAEMON_UNAVAILABLE' } }
        });
      }
    }, 10000); // Every 10 seconds
  }

  private broadcast(message: any) {
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  private handleMessage(ws: any, message: any) {
    switch (message.type) {
      case 'ready':
        ws.send(JSON.stringify({
          type: 'connection_established',
          timestamp: new Date().toISOString()
        }));
        break;
      case 'get_containers':
        // Handle client request
        break;
    }
  }
}

export default WebSocketManager;
```

### 4. Frontend React Components

**File**: `frontend/src/components/ContainerList.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useContainers } from '../hooks/useContainers';
import { useMetrics } from '../hooks/useMetrics';

export const ContainerList: React.FC = () => {
  const { containers, isLoading } = useContainers();
  const { metrics } = useMetrics();

  return (
    <div>
      {isLoading ? (
        <p>Loading containers...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>CPU</th>
              <th>Memory</th>
            </tr>
          </thead>
          <tbody>
            {containers.map(container => {
              const metric = metrics[container.id];
              return (
                <tr key={container.id}>
                  <td>{container.name}</td>
                  <td>{container.status}</td>
                  <td>{metric?.cpu.percentage.toFixed(1)}%</td>
                  <td>{metric?.memory.percentage.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

**File**: `frontend/src/hooks/useMetrics.ts`

```typescript
import { useEffect, useState } from 'react';
import { ContainerMetrics } from '../types';

export const useMetrics = () => {
  const [metrics, setMetrics] = useState<{ [containerId: string]: ContainerMetrics }>({});

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/api/metrics/stream');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'metrics_update') {
        setMetrics(prev => ({
          ...prev,
          [message.data.containerId]: message.data.metrics
        }));
      }
    };

    return () => ws.close();
  }, []);

  return { metrics };
};
```

---

## Testing Strategy

### Unit Tests (Service Logic)

```typescript
// tests/unit/services/docker.service.test.ts
describe('DockerService', () => {
  it('should list all containers', async () => {
    const containers = await dockerService.listContainers();
    expect(Array.isArray(containers)).toBe(true);
    expect(containers[0]).toHaveProperty('id');
    expect(containers[0]).toHaveProperty('status');
  });

  it('should parse CPU metrics correctly', () => {
    const stats = { /* mock stats */ };
    const parsed = dockerService.parseStats(stats);
    expect(parsed.cpu.percentage).toBeGreaterThanOrEqual(0);
  });
});
```

### Integration Tests (Docker API)

```typescript
// tests/integration/docker.integration.test.ts
describe('Docker API Integration', () => {
  it('should connect to Docker daemon', async () => {
    const version = await dockerService.getVersion();
    expect(version).toMatch(/\d+\.\d+/);
  });

  it('should retrieve metrics for running container', async () => {
    // Requires running container
    const metrics = await dockerService.getContainerStats('container-id');
    expect(metrics).toHaveProperty('cpu');
    expect(metrics).toHaveProperty('memory');
  });
});
```

### Contract Tests (API Endpoints)

```typescript
// tests/contract/containers.test.ts
import request from 'supertest';
import app from '../../src/main';

describe('GET /api/containers', () => {
  it('should return container list with correct schema', async () => {
    const response = await request(app)
      .get('/api/containers')
      .expect(200);

    expect(response.body).toHaveProperty('containers');
    expect(Array.isArray(response.body.containers)).toBe(true);
    expect(response.body.containers[0]).toHaveProperty('id');
    expect(response.body.containers[0]).toHaveProperty('status');
  });

  it('should return 503 if Docker daemon unavailable', async () => {
    // Mock docker unavailable
    const response = await request(app)
      .get('/api/containers')
      .expect(503);

    expect(response.body.error.code).toBe('DOCKER_DAEMON_UNAVAILABLE');
  });
});
```

### Component Tests (React)

```typescript
// frontend/tests/components/ContainerList.test.tsx
import { render, screen } from '@testing-library/react';
import { ContainerList } from '../../src/components/ContainerList';

describe('ContainerList Component', () => {
  it('should render loading state initially', () => {
    render(<ContainerList />);
    expect(screen.getByText('Loading containers...')).toBeInTheDocument();
  });

  it('should display containers in table', async () => {
    // Mock API response
    render(<ContainerList />);
    // Wait for data load and verify rendering
  });
});
```

---

## Development Workflow

### 1. Start Docker Daemon

```bash
# Ensure Docker is running
docker --version
docker ps
```

### 2. Start Backend Server

```bash
cd backend
npm run dev    # Starts with ts-node
```

**Output**:
```
Backend server running on http://localhost:3000
WebSocket server on ws://localhost:3000/api/metrics/stream
```

### 3. Start Frontend Development Server

```bash
cd frontend
npm start
```

**Output**:
```
Compiled successfully!
Local: http://localhost:3000  (frontend runs on :3000 by default)
```

### 4. Manual Testing

```bash
# Test REST API
curl http://localhost:3000/api/containers

# Test WebSocket
wscat -c ws://localhost:3000/api/metrics/stream
```

---

## Key Files & Their Purposes

| File | Purpose |
|------|---------|
| `backend/src/main.ts` | Express app setup, port binding |
| `backend/src/services/docker.service.ts` | Docker SDK wrapper, API calls |
| `backend/src/api/routes/containers.ts` | REST endpoints |
| `backend/src/websocket/manager.ts` | WebSocket server, metrics broadcast |
| `backend/src/logger/index.ts` | Structured logging |
| `frontend/src/hooks/useMetrics.ts` | WebSocket connection, metrics state |
| `frontend/src/hooks/useContainers.ts` | REST API calls for container list |
| `frontend/src/components/ContainerList.tsx` | Container list UI |
| `frontend/src/components/MetricsPanel.tsx` | Metrics visualization |

---

## Environment Variables

**Backend** (`.env`):
```
DOCKER_HOST=/var/run/docker.sock
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
FRONTEND_URL=http://localhost:3000
METRICS_UPDATE_INTERVAL=10000
```

**Frontend** (`.env`):
```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

---

## Common Tasks

### Add a New Metric Display

1. Update `ContainerMetrics` type in `frontend/src/types/index.ts`
2. Update `DockerService.parseStats()` in `backend/src/services/docker.service.ts`
3. Add component to display metric in `frontend/src/components/MetricsPanel.tsx`
4. Test with contract tests in `tests/contract/`

### Add a New REST Endpoint

1. Define schema in `data-model.md`
2. Define OpenAPI route in `contracts/openapi.yaml`
3. Implement handler in `backend/src/api/routes/`
4. Add contract test in `tests/contract/`
5. Add integration test if Docker API call required

### Debug Metrics Collection

```bash
# Backend logs
NODE_ENV=development npm run dev

# Frontend browser console
console.log(metrics); // In component or hook

# Manual Docker stats
docker stats --no-stream
```

---

## Performance Tuning

- **Metrics cadence**: Change `METRICS_UPDATE_INTERVAL` (default 10000ms)
- **Container list caching**: Add TTL to container list in memory
- **WebSocket backpressure**: Implement message queue if > 100 containers
- **Log buffer size**: Adjust from 100 lines in `LogEntry` fetch

---

## Next Steps

1. ✅ Run `/speckit.tasks` to generate implementation tasks
2. Implement services (Docker integration)
3. Implement REST API endpoints
4. Implement WebSocket server
5. Implement React components
6. Run tests before each commit (Test-First principle)

---

## References

- [Docker SDK for Node.js](https://github.com/apocas/dockerode)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)
- [OpenAPI Specification](https://spec.openapis.org/)
