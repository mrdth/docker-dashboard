# Research: Docker Container Metrics Dashboard

**Feature**: 001-container-metrics-dashboard
**Date**: 2025-11-01
**Purpose**: Resolve technical unknowns and document design decisions for implementation

---

## Technology Stack Selection

### Backend Framework: Express.js

**Decision**: Use Express.js with Node.js 20+ for backend HTTP and WebSocket server

**Rationale**:
- Lightweight and widely adopted for REST APIs
- Excellent WebSocket support (via express-ws library or Socket.IO)
- Strong npm ecosystem for Docker SDK and utilities
- Matches web application architecture requirement
- Good performance for real-time metrics delivery

**Alternatives Considered**:
- **Nest.js**: More opinionated, add complexity for MVP scope
- **Fastify**: Faster than Express but smaller ecosystem for Docker tooling
- **Python/FastAPI**: Good choice but adds language context switch from TypeScript frontend

**Selected**: Express.js with `express`, `express-ws` (WebSocket), `express-async-errors`

---

### Frontend Framework: Vue 3 with Composition API

**Decision**: Use Vue 3 with TypeScript and Composition API for browser UI

**Rationale**:
- Lighter weight than React, excellent for dashboard UIs
- Composition API enables reactive state management with minimal boilerplate
- Superior template syntax (less verbose than JSX)
- Excellent real-time update capability via reactive refs and computed properties
- Strong ecosystem for component libraries (shadcn-vue available)
- Faster development cycle with hot module replacement (HMR) via Vite
- Better TypeScript integration with fewer type gymnastics

**Alternatives Considered**:
- **React 18**: Industry standard but more verbose, larger bundle size
- **Svelte**: Best performance but smaller ecosystem for UI component libraries
- **Plain HTML/CSS**: No component reusability, harder to maintain

**Selected**: Vue 3 with TypeScript, Composition API, Vite for build tooling

---

### Real-Time Delivery: WebSocket with REST Fallback

**Decision**: WebSocket (express-ws) for real-time metrics, fallback to REST polling for incompatible browsers

**Rationale**:
- Specification clarification Q1 requires real-time metric delivery
- WebSocket provides sub-second latency for 10-second metric updates
- Server-Sent Events (SSE) would be simpler but WebSocket has better browser support for bidirectional communication (future dashboard controls)
- Explicit fallback to REST polling handles older browsers or restricted networks
- `express-ws` is more idiomatic for Express applications: treats WebSocket routes like regular Express routes, supports middleware, reduces boilerplate

**Implementation Strategy**:
- Backend: Express server with `express-ws` middleware for seamless WebSocket integration
- Frontend: Automatic connection retry with exponential backoff
- Error handling: Show error banner, auto-retry every 5 seconds (specification clarification Q2)
- WebSocket endpoints defined as Express routes (cleaner than manual server setup)

**Selected**: WebSocket (express-ws) with REST API fallback

---

### Docker Integration: Node Docker SDK

**Decision**: Use official `dockerode` npm package for Docker API communication

**Rationale**:
- Official Node.js binding for Docker API
- Stable, well-maintained, widely used
- Supports Docker API v1.40+ (specification requirement)
- Good error handling and event stream support for metrics collection

**Alternatives Considered**:
- **Docker CLI via shell execution**: Unreliable, harder to parse, security risk
- **Moby SDK (Go)**: Requires separate service, adds complexity

**Selected**: `dockerode` npm package

---

### Build Tool: Vite

**Decision**: Use Vite as the build tool and development server for frontend

**Rationale**:
- Lightning-fast development server with instant HMR
- Native ES modules support in development (no bundling overhead)
- Optimized production builds using Rollup
- Excellent TypeScript support out-of-the-box
- Smaller configuration footprint than Webpack
- Perfect pairing with Vue 3
- ~10x faster than traditional bundlers in development

**Alternatives Considered**:
- **Webpack**: Industry standard but slower, more configuration required
- **Rollup**: Great for libraries, less developer experience for apps
- **esbuild**: Extremely fast but less mature ecosystem

**Selected**: Vite with Vue 3 plugin

---

### Component Library & Styling: Reka UI v2 + Tailwind CSS

**Decision**: Use Reka UI v2 (successor to Radix Vue v1) with Tailwind CSS for UI components and styling

**Rationale**:
- Reka UI v2: Modern, LLM-optimized component library built on Radix primitives
- Unstyled, flexible components with full customization control
- Built on Radix primitives (proven, accessible foundation)
- Tailwind CSS provides utility-first styling (fast, consistent)
- Extensive component library: Form (13), Date/Time (7), General (22+) components
- Accessibility-first with WAI-ARIA compliance and cross-browser testing
- Server-side rendering support and i18n built-in
- No additional CSS-in-JS runtime overhead
- Excellent TypeScript support with comprehensive documentation
- Optimized for AI code generation workflows

**Alternatives Considered**:
- **shadcn-vue**: Copy-paste model, but requires maintenance of local component copies
- **Radix Vue v1**: Excellent but Reka UI v2 is the actively developed successor
- **Material UI**: Heavy, more prescriptive, overkill for dashboard
- **Headless UI**: More manual component building required
- **Plain Tailwind**: Less pre-built components, more code needed

**Selected**: Reka UI v2 components + Tailwind CSS

---

### Testing Framework: Vitest + Vue Test Utils

**Decision**: Vitest for all test types (unit, integration, component), Vue Test Utils for component testing

**Rationale**:
- Vitest: Modern alternative to Jest, faster, excellent Vite integration
- Single test runner across backend and frontend (consistency)
- Vue Test Utils: Official Vue testing library, native Vue component support
- Supertest: REST API contract testing (unchanged)
- All support TypeScript natively with minimal configuration
- Vitest provides instant feedback with watch mode
- Faster test execution via esbuild/rollup

**Test Strategy**:
- **Unit Tests**: Service logic (Docker integration, metrics calculation)
- **Integration Tests**: Docker API integration, metrics aggregation
- **Contract Tests**: API endpoint validation (Supertest)
- **Component Tests**: Vue components (Vue Test Utils)
- **All tests**: Run before implementation (Test-First principle)

**Selected**: Vitest + Vue Test Utils + Supertest

---

### Docker API Version Strategy

**Decision**: Support Docker API v1.40+ (Docker 19.03+), reject older versions with clear error message

**Rationale**:
- Specification clarification Q3 decision
- Docker 19.03 released June 2019, widely deployed in production
- API v1.40 provides stable metrics endpoints
- Metrics endpoint: `GET /containers/{id}/stats`
- List endpoint: `GET /containers/json`
- Logs endpoint: `GET /containers/{id}/logs`

**Implementation**:
- Backend health check verifies Docker API version on startup
- Return HTTP 503 with version error message if incompatible
- Log clear version requirement in error responses

---

### Image Registry Handling: Docker Hub Only (MVP)

**Decision**: Check image updates via Docker Hub API only, private registries show "unable to check" indicator

**Rationale**:
- Specification clarification Q5 decision
- Docker Hub is default registry for most users
- Simplifies MVP (no credential management needed)
- Private registry support deferred to v2
- Clear indicator prevents silent failures

**Implementation**:
- Registry detection: Parse image name (e.g., `mysql:5.7` → Docker Hub, `gcr.io/project/image` → GCR)
- Docker Hub check: Call Docker Hub API to get latest tag
- Private registry: Show "unable to check" label with documentation link
- Update checks: Run every 24 hours (specification assumption #6)

**Selected Registry API**: Docker Hub Registry API v2

---

### Log Retrieval Strategy: In-Memory with Fresh Fetch

**Decision**: Keep last 100 log lines in memory with 1-hour rolling window; fetch fresh from Docker API on container detail view

**Rationale**:
- Specification clarification Q4 decision
- Balances performance (fast display) with memory efficiency
- Prevents stale logs in long-running dashboards
- Accommodates typical incident investigation timeframes (1-hour window)

**Implementation**:
- Backend maintains circular buffer per container (max 100 lines)
- Buffer refreshed when container detail view opens
- Uses `GET /containers/{id}/logs?tail=100&timestamps=true`
- Lines older than 1 hour discarded from display

---

### Error Handling & Graceful Degradation

**Decision**: WebSocket → REST polling fallback; Docker Hub → skip update checks; Error banner with auto-retry

**Rationale**:
- Specification requirements FR-008, FR-012, assumption #5
- Users see operational status even when metrics become unavailable
- Auto-retry prevents manual refresh requirement
- Clear error messaging enables debugging

**Implementation**:
1. **WebSocket Failure**: Frontend logs warning, attempts REST polling fallback
2. **Docker Daemon Unavailable**: Backend returns 503 with "Docker daemon unavailable" message, frontend shows error banner
3. **Metric Collection Failure**: Show "unavailable" status, retry every 5 seconds, clear on recovery
4. **Registry Unavailability**: Silently skip image update checks, mark as "unable to check"

---

### Configuration Management

**Decision**: Environment variables via `.env` file (development) and process.env (production)

**Rationale**:
- Constitution Principle IV: Configuration must be environment-based, never hardcoded
- Aligns with 12-factor app methodology
- Supports local development and Docker container deployment

**Required Environment Variables**:
- `DOCKER_HOST`: Docker daemon socket (default: /var/run/docker.sock)
- `NODE_ENV`: development/production
- `LOG_LEVEL`: debug/info/warn/error
- `PORT`: Backend HTTP port (default: 3000)
- `FRONTEND_URL`: Frontend URL for CORS
- `METRICS_UPDATE_INTERVAL`: Metrics poll interval (default: 10000ms)

---

### Logging Strategy

**Decision**: Structured logging with Winston library, console output in development, JSON output in production

**Rationale**:
- Constitution Principle V: Operations teams must be able to debug from logs alone
- Structured logging enables log aggregation and parsing
- Clear error context (what was being done, with what data)

**Implementation**:
- Backend logger: Winston with custom formatters
- Log levels: debug (detailed), info (significant events), warn (recoverable issues), error (critical issues)
- Each log entry includes: timestamp, level, service, operation, context, error (if applicable)

---

## Performance Targets

### Dashboard Load Time: <3 seconds (50+ containers)

**Strategy**:
- Minimal initial API call: Return only container list (names, IDs, status) first
- Lazy load metrics on demand or after initial render
- Frontend pagination for large container lists

### Metrics Update Latency: 10 seconds

**Strategy**:
- WebSocket ensures <100ms end-to-end latency for metric delivery
- Docker stats API polling: 10-second window per specification

### Search Response Time: <1 second

**Strategy**:
- Client-side filtering of container list (no API call)
- Pre-load full container data on dashboard load
- Optimize for containers list (typically <100)

### API 95th Percentile Latency: <200ms

**Strategy**:
- Docker API calls are direct pass-through (no heavy computation)
- Metrics aggregation happens in background, not in request path
- Connection pooling for Docker API

---

## Dependencies & Versions

### Backend
```json
{
  "express": "^5.1.0",
  "express-ws": "^5.0.2",
  "dockerode": "^4.0.9",
  "dotenv": "^17.2.3",
  "winston": "^3.18.3",
  "typescript": "^5.9.3",
  "vitest": "^4.0.6",
  "supertest": "^7.1.4"
}
```

### Frontend
```json
{
  "vue": "^3.5.13",
  "vite": "^7.1.12",
  "typescript": "^5.9.3",
  "tailwindcss": "^4.1.4",
  "postcss": "^8.5.3",
  "autoprefixer": "^10.4.21",
  "reka-ui": "^2.6.0",
  "vitest": "^4.0.6",
  "@vue/test-utils": "^2.4.6"
}
```

### Vite Config (Frontend)
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

---

## References & Documentation

**Key Resources for Implementation**:

**Component Library & Styling**:
- [Reka UI v2 LLM Documentation](https://reka-ui.com/llms.txt) — AI-optimized component docs for code generation
- [Reka UI Official Docs](https://reka-ui.com) — Complete component library reference
- [Tailwind CSS Documentation](https://tailwindcss.com) — Utility-first CSS framework

**Backend & Infrastructure**:
- [Docker SDK for Node.js (dockerode)](https://github.com/apocas/dockerode) — Docker API integration
- [Docker API Documentation](https://docs.docker.com/engine/api/) — Official Docker REST API spec
- [Express.js Documentation](https://expressjs.com/) — HTTP server framework
- [express-ws Documentation](https://github.com/HenningM/express-ws) — WebSocket integration for Express

**Frontend & State Management**:
- [Vue 3 Documentation](https://vuejs.org/) — Progressive JavaScript framework
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html) — Reactive state management
- [Vite Documentation](https://vitejs.dev/) — Frontend build tool and dev server

**Testing**:
- [Vitest Documentation](https://vitest.dev/) — Unit and integration testing framework
- [Vue Test Utils](https://test-utils.vuejs.org/) — Vue component testing library
- [Supertest Documentation](https://github.com/visionmedia/supertest) — HTTP assertion library for Express

**API Design**:
- [OpenAPI Specification](https://spec.openapis.org/) — REST API contract specification

---

## Next Steps

All major technical unknowns have been resolved:

✅ Technology stack (TypeScript/Node.js/Express/React)
✅ Real-time delivery mechanism (WebSocket + REST fallback)
✅ Docker integration strategy (dockerode SDK)
✅ Error handling and graceful degradation
✅ Configuration and logging strategy
✅ Performance targets

**Proceed to Phase 1**: Generate data-model.md, API contracts, and quickstart.md
