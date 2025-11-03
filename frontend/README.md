# Frontend - Docker Container Metrics Dashboard

Vue 3 + TypeScript frontend providing real-time dashboard for Docker container metrics.

## Project Structure

```
frontend/
├── src/
│   ├── main.ts                # Vue app entry point
│   ├── App.vue                # Root component
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces matching backend
│   ├── services/
│   │   ├── api.ts             # HTTP client with CORS handling
│   │   └── websocket.ts       # WebSocket connection manager
│   ├── composables/
│   │   └── useContainers.ts   # Container list state management
│   ├── pages/
│   │   ├── Dashboard.vue      # Main container list page
│   │   └── ContainerDetail.vue # Container detail page
│   ├── components/
│   │   ├── ErrorBoundary.vue           # Error boundary component
│   │   ├── ErrorBanner.vue             # Error message banner
│   │   ├── LoadingSpinner.vue          # Loading indicator
│   │   ├── ContainerListTable.vue      # Main container table
│   │   ├── ContainerStatusBadge.vue    # Status indicator
│   │   ├── MetricsCell.vue             # Metrics display with color
│   │   ├── ContainerEmptyState.vue     # Empty list message
│   │   ├── ContainerFilters.vue        # Search & filter controls
│   │   ├── UpdateIndicator.vue         # Image update badge
│   │   ├── PortsList.vue               # Port mappings display
│   │   ├── LogsViewer.vue              # Logs display
│   │   └── ContainerDetailView.vue     # Detail panel
│   └── router.ts              # Vue Router configuration
├── tests/
│   └── unit/                  # Component tests
├── public/                    # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── postcss.config.cjs
└── .env                       # Environment variables
```

## Setup

### Install Dependencies

```bash
cd frontend
npm install
```

### Configure Environment

Create `.env`:

```bash
# .env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Run Development Server

```bash
npm run dev
```

Frontend starts on port 5173 (http://localhost:5173)

Development server proxies `/api` requests to backend on port 3000.

### Build for Production

```bash
npm run build
```

Creates optimized production build in `dist/` directory.

```bash
npm run preview
```

Preview production build locally.

## Components

### Pages

#### Dashboard.vue

Main page showing container list with real-time updates.

**Features**:
- Container list with status, metrics, and update indicators
- Search & filter by name and status
- Real-time WebSocket updates
- Error banner for Docker daemon unavailable
- Pagination support (50 per page)

**Props**: None (uses composables)

**Usage**:

```vue
<template>
  <Dashboard />
</template>
```

#### ContainerDetail.vue

Detail page for single container showing full information.

**Route**: `/containers/:id`

**Features**:
- Container information (name, status, image)
- Full metrics display (CPU, memory, disk I/O, network I/O)
- Port mappings
- Recent logs

### Shared Components

#### ContainerListTable.vue

Renders container list as HTML table.

**Props**:

```typescript
containers: Container[]
```

**Features**:
- Name, ID, status, created time columns
- CPU%, Memory% with color-coded metrics
- Update indicator
- Details button linking to container detail page
- Hover effects

#### ContainerStatusBadge.vue

Status indicator badge (running/stopped/paused/exited).

**Props**:

```typescript
status: "running" | "stopped" | "paused" | "exited"
```

**Colors**:
- Running: Green
- Stopped: Gray
- Paused: Yellow
- Exited: Red

#### MetricsCell.vue

Displays metric percentage with color coding and progress bar.

**Props**:

```typescript
value: number                    // Percentage (0+ for CPU, 0-100 for memory)
type: "cpu" | "memory"          // Metric type
lastUpdated?: Date              // Timestamp for stale indicator
```

**Features**:
- Color coding: green (<50%), yellow (50-80%), red (>80%)
- Progress bar visualization
- CPU values can exceed 100% (multi-core)
- Tooltip showing detailed breakdown
- Stale indicator for data >30 seconds old
- Smooth animations on value changes

#### UpdateIndicator.vue

Shows image update availability.

**Props**:

```typescript
imageInfo?: {
  updateAvailable: boolean
  latestVersion: string
  registryStatus: "checked" | "unable_to_check" | "checking"
}
```

**Features**:
- "Update available" badge with latest version on hover
- Handles private registries gracefully
- Status indicators

#### PortsList.vue

Displays container port mappings.

**Props**:

```typescript
ports: Array<{
  protocol: string          // tcp/udp
  containerPort: number
  hostPort: number
  hostIp: string
}>
```

**Format**: `8080:80/tcp` or "no ports exposed"

#### LogsViewer.vue

Displays container logs in scrollable panel.

**Props**:

```typescript
logs: Array<{
  timestamp: string
  message: string
  stream: "stdout" | "stderr"
}>
```

**Features**:
- Last 100 log lines
- Monospace formatting
- Timestamps left-aligned
- Scrollable panel

#### ContainerFilters.vue

Search and filter controls.

**Features**:
- Name search input (debounced 300ms)
- Status dropdown filter
- Clear filters button
- Emits filter events

#### ContainerEmptyState.vue

Message shown when no containers exist or all filtered out.

#### ErrorBanner.vue

Error message display with auto-dismiss.

**Triggers**: Docker daemon unavailable, metrics fetch errors

#### ErrorBoundary.vue

Vue 3 error boundary component catching component rendering errors.

**Features**:
- Catches and displays component errors
- Retry button
- Prevents full app crash

#### LoadingSpinner.vue

Animated loading indicator.

## Composables

### useContainers()

Main state management for container list.

**State**:

```typescript
containers: Ref<Container[]>           // All containers
filteredContainers: Ref<Container[]>   // Filtered containers
filters: Ref<{ name: string; status: string }>
loading: Ref<boolean>
error: Ref<string | null>
lastUpdated: Ref<Date | null>
```

**Methods**:

```typescript
fetchContainers(): Promise<void>
```

Fetches container list from REST API, with metrics per container. Caches for 30 seconds.

**WebSocket Integration**:

- Listens for `container_status_changed` messages
- Listens for `metrics_update` messages
- Listens for `container_list` messages
- Updates containers in real-time
- Reconnects automatically with exponential backoff (1s → 30s)

**Usage**:

```vue
<script setup>
import { useContainers } from '@/composables/useContainers'

const { containers, filteredContainers, filters, loading, error } = useContainers()
</script>

<template>
  <ContainerListTable v-if="!loading" :containers="filteredContainers" />
  <LoadingSpinner v-else />
  <ErrorBanner v-if="error" :message="error" />
</template>
```

## Services

### api.ts

HTTP client for backend communication.

```typescript
import { get, post, put, delete } from '@/services/api'

// Get containers
const response = await get('/api/containers')

// Get single container
const detail = await get(`/api/containers/${id}`)
```

**Features**:
- JSON content-type
- CORS safe
- Error handling
- Type-safe with TypeScript generics

### websocket.ts

WebSocket connection manager.

```typescript
import { getWebSocketConnection } from '@/services/websocket'

const ws = getWebSocketConnection()

// Connect
await ws.connect()

// Send message
ws.send({ type: 'ready' })

// Listen for messages
ws.onMessage((msg) => console.log(msg))

// Listen for errors
ws.onError((err) => console.error(err))

// Disconnect
ws.disconnect()
```

**Features**:
- Auto-reconnect with exponential backoff
- Keep-alive ping/pong
- Message queuing
- Multiple message handlers
- Singleton instance

## Running Tests

### All Tests

```bash
npm run test
```

### Watch Mode

```bash
npm run test:watch
```

### UI Mode

```bash
npm run test:ui
```

Opens interactive test UI in browser.

### Coverage

```bash
npm run test -- --coverage
```

## Styling

Uses Tailwind CSS utility classes.

### Configuration

- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.cjs` - PostCSS plugins (Tailwind, Autoprefixer)
- `src/App.vue` - Global styles

### Color Scheme

- Primary: Blue (#2563eb)
- Success: Green (#16a34a)
- Warning: Yellow (#eab308)
- Danger: Red (#dc2626)
- Neutral: Gray (#6b7280)

## Performance Features

- Component lazy loading via Vue Router
- Container list caching (30s TTL)
- WebSocket metrics throttling (max 1/sec per container)
- Smooth animations for metric changes
- Stale data indicators (>30 seconds)
- Pagination for large deployments

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

## Development Workflow

### Add New Component

1. Create component in `src/components/YourComponent.vue`
2. Write tests in `src/__tests__/YourComponent.test.ts`
3. Use TypeScript interfaces from `src/types/index.ts`
4. Import and use in pages or parent components

### Add New Page

1. Create page in `src/pages/YourPage.vue`
2. Add route in `src/router.ts`
3. Link from navigation components

### Testing Components

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MyComponent from '@/components/MyComponent.vue'

describe('MyComponent', () => {
  it('renders properly', () => {
    const wrapper = mount(MyComponent, {
      props: { title: 'Hello' }
    })
    expect(wrapper.text()).toContain('Hello')
  })
})
```

## Environment Variables

- `VITE_API_URL` - Backend API base URL
- `VITE_WS_URL` - WebSocket server URL

## Troubleshooting

**WebSocket connection failed**: Check `VITE_WS_URL` environment variable and backend running.

**Metrics not updating**: Verify WebSocket connection and check browser console for errors.

**Styles not applying**: Rebuild Tailwind CSS with `npm run dev` or restart dev server.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development workflow.
