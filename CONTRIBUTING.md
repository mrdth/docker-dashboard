# Contributing to Docker Container Metrics Dashboard

Thank you for contributing! This guide covers development workflow, testing, and code standards.

## Development Setup

### Prerequisites

- Node.js 20+ and npm
- Docker daemon running
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd docker-dashboard

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Start Development Environment

Terminal 1 - Backend:

```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3000

## Development Workflow

### Branching

Branch naming: `feature/description` or `fix/description`

```bash
git checkout -b feature/my-feature
```

### Commit Conventions

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:

```
feat(frontend): add container filtering by status

- Implement ContainerFilters component
- Add useContainers composable with filters
- Add filter tests

Closes #123
```

### Submitting Changes

1. Push to your branch
2. Create Pull Request with description of changes
3. Ensure all tests pass in CI/CD
4. Request review from maintainers
5. Address feedback
6. Merge after approval

## Testing Strategy

### Test Types

#### Unit Tests

Test individual services and utilities.

**Location**: `backend/tests/unit/`, `frontend/src/__tests__/`

**Run**:

```bash
npm run test:unit
```

#### Integration Tests

Test Docker API integration and service interactions.

**Location**: `backend/tests/integration/`

**Run**:

```bash
npm run test:integration
```

#### Contract Tests

Test API endpoints and WebSocket protocols.

**Location**: `backend/tests/contract/`

**Run**:

```bash
npm run test:contract
```

#### Component Tests

Test Vue components in isolation.

**Location**: `frontend/src/__tests__/`

**Run**:

```bash
npm run test
```

### Writing Tests

#### Backend Tests

Using Vitest + Supertest:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { getDockerService } from '@/services/docker.service'

describe('DockerService', () => {
  let dockerService: ReturnType<typeof getDockerService>

  beforeEach(() => {
    dockerService = getDockerService()
  })

  it('should list containers', async () => {
    const containers = await dockerService.listContainers()
    expect(Array.isArray(containers)).toBe(true)
  })
})
```

#### Frontend Component Tests

Using Vitest + Vue Test Utils:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MetricsCell from '@/components/MetricsCell.vue'

describe('MetricsCell', () => {
  it('displays correct color for CPU percentage', () => {
    const wrapper = mount(MetricsCell, {
      props: { value: 75, type: 'cpu' }
    })
    expect(wrapper.classes()).toContain('bg-yellow-100')
  })
})
```

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test -- --coverage

# Specific file
npm run test -- MetricsCell.test.ts
```

### Coverage Requirements

- Backend services: ≥80%
- Frontend components: ≥70%
- Integration tests: Critical paths covered

## Code Standards

### TypeScript

- Use TypeScript, no `any` types
- Enable strict mode
- Add JSDoc comments to public functions

**Example**:

```typescript
/**
 * Fetches container metrics from Docker API
 * @param containerId - Full container ID from Docker
 * @returns Promise resolving to metrics object
 * @throws DockerDaemonError if Docker unavailable
 */
export async function getContainerStats(containerId: string): Promise<Metrics> {
  // implementation
}
```

### Frontend Components

- Use Vue 3 Composition API with `<script setup>`
- Prefix internal methods with `handle` or verb
- Use TypeScript `Props` interface with `defineProps`
- Add component comments

**Example**:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  status: 'running' | 'stopped'
  onChanged?: () => void
}

const props = withDefaults(defineProps<Props>(), {})

const isRunning = computed(() => props.status === 'running')

function handleClick() {
  // action
}
</script>

<template>
  <button @click="handleClick">
    {{ isRunning ? 'Running' : 'Stopped' }}
  </button>
</template>
```

### Styling

Use Tailwind CSS utility classes. No custom CSS unless necessary.

```vue
<template>
  <div class="px-4 py-2 bg-blue-100 text-blue-900 rounded">
    Message
  </div>
</template>
```

### Commit Code Quality

Before committing:

```bash
# Lint check
npm run lint

# Format check
npm run format

# Type check
npx tsc --noEmit

# Run tests
npm run test
```

## Documentation

### Code Comments

- Comment complex logic
- Document public APIs with JSDoc
- Use clear variable names, minimal comments needed

### README Updates

Update relevant README when:

- Adding new API endpoint
- Changing project structure
- Adding major feature
- Changing setup instructions

## Performance Guidelines

- Keep component rendering fast (<100ms)
- Use pagination for large lists (>50 items)
- Throttle frequent updates (WebSocket metrics max 1/sec)
- Cache data when appropriate (container list 30s TTL)
- Lazy load routes and components

## Debugging

### Backend

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Inspect Docker API calls
# Check docker.service.ts for API calls
```

### Frontend

- Use Vue DevTools extension
- Check browser console for errors
- Verify WebSocket connection: `ws.isConnected()`
- Check network tab for API responses

## Deployment

### Production Build

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Docker

```bash
# Build backend image
docker build -f backend/Dockerfile -t dashboard-backend .

# Build frontend image
docker build -f frontend/Dockerfile -t dashboard-frontend .

# Run with docker-compose
docker-compose up
```

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Create GitHub release with notes

## Reporting Issues

Include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Docker version, Node version)
- Browser (if frontend issue)
- Relevant logs

## Questions?

- Check README in `backend/` and `frontend/`
- Review existing PRs for examples
- Open discussion issue for questions

Thank you for contributing!
