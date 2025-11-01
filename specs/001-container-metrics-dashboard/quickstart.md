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
# Create frontend project with Vite (from parent directory)
cd ..
npm create vite@latest frontend -- --template vue-ts
cd frontend
npm install

# Install additional dependencies
npm install tailwindcss postcss autoprefixer
npm install -D @vue/test-utils vitest happy-dom
npx tailwindcss init -p

# Install shadcn-vue (component library setup)
npm install shadcn-vue @radix-vue radix-vue
```

**Vite + Vue 3 Development Server**:
- Runs on `http://localhost:5173` (default)
- Instant HMR (Hot Module Replacement)
- Built-in TypeScript support
- API proxy to backend (configured in `vite.config.ts`)


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

### 4. Frontend Vue 3 Components

**File**: `frontend/src/components/ContainerList.vue`

```vue
<template>
  <div class="w-full">
    <div v-if="isLoading" class="text-center py-8">
      <p class="text-gray-600">Loading containers...</p>
    </div>
    <div v-else>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>CPU</TableHead>
            <TableHead>Memory</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="container in containers" :key="container.id">
            <TableCell>{{ container.name }}</TableCell>
            <TableCell>
              <Badge :variant="statusVariant(container.status)">
                {{ container.status }}
              </Badge>
            </TableCell>
            <TableCell>
              {{ metrics[container.id]?.cpu.percentage.toFixed(1) || 'N/A' }}%
            </TableCell>
            <TableCell>
              {{ metrics[container.id]?.memory.percentage.toFixed(1) || 'N/A' }}%
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useContainers } from '@/composables/useContainers'
import { useMetrics } from '@/composables/useMetrics'

const { containers, isLoading } = useContainers()
const { metrics } = useMetrics()

const statusVariant = (status: string) => {
  const variants: Record<string, string> = {
    running: 'default',
    stopped: 'secondary',
    paused: 'outline',
    exited: 'destructive'
  }
  return variants[status] || 'secondary'
}
</script>
```

**File**: `frontend/src/composables/useMetrics.ts`

```typescript
import { ref, computed } from 'vue'
import type { ContainerMetrics } from '@/types'

export const useMetrics = () => {
  const metrics = ref<Record<string, ContainerMetrics>>({})
  const wsUrl = `ws://${window.location.hostname}:3000/api/metrics/stream`

  const connect = () => {
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'metrics_update') {
        metrics.value[message.data.containerId] = message.data.metrics
      }
    }

    ws.onclose = () => {
      // Auto-reconnect with exponential backoff
      setTimeout(connect, 5000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  connect()

  return {
    metrics: computed(() => metrics.value)
  }
}
```

**File**: `frontend/src/composables/useContainers.ts`

```typescript
import { ref } from 'vue'
import type { Container } from '@/types'

export const useContainers = () => {
  const containers = ref<Container[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  const fetchContainers = async () => {
    try {
      const response = await fetch('/api/containers')
      const data = await response.json()
      
      if (data.error) {
        error.value = data.error.message
      } else {
        containers.value = data.containers
      }
    } catch (e) {
      error.value = 'Failed to fetch containers'
    } finally {
      isLoading.value = false
    }
  }

  fetchContainers()
  // Refetch periodically
  setInterval(fetchContainers, 30000)

  return {
    containers,
    isLoading,
    error
  }
}
```

---

## Testing Strategy

### Unit Tests (Service Logic) - Vitest

```typescript
// backend/tests/unit/services/docker.service.test.ts
import { describe, it, expect } from 'vitest'
import dockerService from '@/services/docker.service'

describe('DockerService', () => {
  it('should list all containers', async () => {
    const containers = await dockerService.listContainers()
    expect(Array.isArray(containers)).toBe(true)
    expect(containers[0]).toHaveProperty('id')
    expect(containers[0]).toHaveProperty('status')
  })

  it('should parse CPU metrics correctly', () => {
    const stats = { /* mock stats */ }
    const parsed = dockerService.parseStats(stats)
    expect(parsed.cpu.percentage).toBeGreaterThanOrEqual(0)
  })
})
```

### Integration Tests (Docker API) - Vitest

```typescript
// backend/tests/integration/docker.integration.test.ts
import { describe, it, expect } from 'vitest'
import dockerService from '@/services/docker.service'

describe('Docker API Integration', () => {
  it('should connect to Docker daemon', async () => {
    const version = await dockerService.getVersion()
    expect(version).toMatch(/\d+\.\d+/)
  })

  it('should retrieve metrics for running container', async () => {
    // Requires running container
    const metrics = await dockerService.getContainerStats('container-id')
    expect(metrics).toHaveProperty('cpu')
    expect(metrics).toHaveProperty('memory')
  })
})
```

### Contract Tests (API Endpoints) - Vitest + Supertest

```typescript
// backend/tests/contract/containers.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '@/main'

describe('GET /api/containers', () => {
  it('should return container list with correct schema', async () => {
    const response = await request(app)
      .get('/api/containers')
      .expect(200)

    expect(response.body).toHaveProperty('containers')
    expect(Array.isArray(response.body.containers)).toBe(true)
    expect(response.body.containers[0]).toHaveProperty('id')
    expect(response.body.containers[0]).toHaveProperty('status')
  })

  it('should return 503 if Docker daemon unavailable', async () => {
    // Mock docker unavailable
    const response = await request(app)
      .get('/api/containers')
      .expect(503)

    expect(response.body.error.code).toBe('DOCKER_DAEMON_UNAVAILABLE')
  })
})
```

### Component Tests (Vue 3) - Vitest + Vue Test Utils

```typescript
// frontend/tests/components/ContainerList.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ContainerList from '@/components/ContainerList.vue'

describe('ContainerList Component', () => {
  it('should render loading state initially', () => {
    const wrapper = mount(ContainerList, {
      global: {
        stubs: {
          Table: true,
          TableHeader: true,
          TableBody: true,
          TableRow: true,
          TableCell: true,
          Badge: true
        }
      }
    })
    
    expect(wrapper.text()).toContain('Loading containers...')
  })

  it('should display containers in table', async () => {
    // Mock API response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          containers: [
            { id: '123', name: 'nginx', status: 'running' }
          ],
          error: null
        })
      })
    )

    const wrapper = mount(ContainerList, {
      global: {
        stubs: {
          Table: true,
          TableHeader: true,
          TableBody: true,
          TableRow: true,
          TableCell: true,
          Badge: true
        }
      }
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('nginx')
  })
})
```

### Composable Tests (Vue 3) - Vitest

```typescript
// frontend/tests/composables/useMetrics.test.ts
import { describe, it, expect, vi } from 'vitest'
import { useMetrics } from '@/composables/useMetrics'

describe('useMetrics composable', () => {
  it('should initialize with empty metrics', () => {
    const { metrics } = useMetrics()
    expect(metrics.value).toEqual({})
  })

  it('should update metrics on message', async () => {
    const { metrics } = useMetrics()
    
    // Simulate WebSocket message
    const mockMessage = {
      type: 'metrics_update',
      data: {
        containerId: 'test-id',
        metrics: { cpu: { percentage: 25.5 } }
      }
    }
    
    // Test would mock WebSocket and dispatch message
    expect(metrics.value).toBeDefined()
  })
})
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
npm run dev    # Starts with ts-node, watches for changes
```

**Output**:
```
Backend server running on http://localhost:3000
WebSocket server on ws://localhost:3000/api/metrics/stream
```

### 3. Start Frontend Development Server with Vite

```bash
cd frontend
npm run dev    # Vite dev server with HMR
```

**Output**:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Key Vite Features**:
- Instant HMR (Hot Module Replacement) - changes reflect immediately
- No page reload needed for most changes
- Lightning-fast dev server startup
- Built-in TypeScript support

### 4. Access Dashboard

Open your browser to: `http://localhost:5173/`

The frontend automatically proxies API calls to backend (`/api` → `http://localhost:3000`)

### 5. Run Tests

```bash
# Backend tests (from backend/)
npm run test           # Run all tests
npm run test:watch    # Watch mode
npm run test:unit     # Unit tests only
npm run test:integration # Integration tests only

# Frontend tests (from frontend/)
npm run test          # Run all tests
npm run test:watch   # Watch mode
npm run test:ui      # Vitest UI for visual debugging
```

### 6. Manual Testing

```bash
# Test REST API
curl http://localhost:3000/api/containers

# Test WebSocket
wscat -c ws://localhost:3000/api/metrics/stream

# View Vite HMR in action
# Edit frontend/src/components/ContainerList.vue and save
# Changes appear instantly in browser without reload
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
| `frontend/src/composables/useMetrics.ts` | WebSocket connection, metrics state (Vue Composition API) |
| `frontend/src/composables/useContainers.ts` | REST API calls for container list |
| `frontend/src/components/ContainerList.vue` | Container list UI with shadcn-vue Table & Badge |
| `frontend/src/components/MetricsPanel.vue` | Metrics visualization with Tailwind CSS |
| `frontend/vite.config.ts` | Vite configuration with Vue 3 plugin, API proxy |
| `frontend/tailwind.config.ts` | Tailwind CSS configuration for shadcn-vue |

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
