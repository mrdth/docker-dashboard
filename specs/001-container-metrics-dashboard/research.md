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
- Excellent WebSocket support (via ws library or Socket.IO)
- Strong npm ecosystem for Docker SDK and utilities
- Matches web application architecture requirement
- Good performance for real-time metrics delivery

**Alternatives Considered**:
- **Nest.js**: More opinionated, add complexity for MVP scope
- **Fastify**: Faster than Express but smaller ecosystem for Docker tooling
- **Python/FastAPI**: Good choice but adds language context switch from TypeScript frontend

**Selected**: Express.js with `express`, `ws` (WebSocket), `express-async-errors`

---

### Frontend Framework: React 18+

**Decision**: Use React 18 with TypeScript for browser UI

**Rationale**:
- Industry standard for dashboard UIs
- Excellent real-time update capability via hooks
- Strong ecosystem for charts/metrics visualization (optional future enhancement)
- Component reusability aligns with architecture principles
- React Testing Library for testable components

**Alternatives Considered**:
- **Vue**: Lighter weight, similar capability, smaller ecosystem
- **Svelte**: Best performance, smaller market adoption
- **Plain HTML/CSS**: No component reusability, harder to maintain

**Selected**: React 18 with TypeScript, emotion for styling

---

### Real-Time Delivery: WebSocket with REST Fallback

**Decision**: WebSocket (ws) for real-time metrics, fallback to REST polling for incompatible browsers

**Rationale**:
- Specification clarification Q1 requires real-time metric delivery
- WebSocket provides sub-second latency for 10-second metric updates
- Server-Sent Events (SSE) would be simpler but WebSocket has better browser support for bidirectional communication (future dashboard controls)
- Explicit fallback to REST polling handles older browsers or restricted networks

**Implementation Strategy**:
- Backend: Express server with `ws` library for WebSocket support
- Frontend: Automatic connection retry with exponential backoff
- Error handling: Show error banner, auto-retry every 5 seconds (specification clarification Q2)

**Selected**: WebSocket (ws library) with REST API fallback

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

### Testing Framework: Jest + React Testing Library

**Decision**: Jest for unit/integration tests, React Testing Library for component testing

**Rationale**:
- Jest: Industry standard for Node.js and React projects
- React Testing Library: Tests user interactions, not implementation details
- Supertest: REST API contract testing
- Both support TypeScript natively

**Test Strategy**:
- **Unit Tests**: Service logic (Docker integration, metrics calculation)
- **Integration Tests**: Docker API integration, metrics aggregation
- **Contract Tests**: API endpoint validation (Supertest)
- **Component Tests**: React components (React Testing Library)
- **All tests**: Run before implementation (Test-First principle)

**Selected**: Jest + React Testing Library + Supertest

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
  "express": "^4.18.x",
  "ws": "^8.x",
  "dockerode": "^3.3.x",
  "dotenv": "^16.x",
  "winston": "^3.x",
  "typescript": "^5.x",
  "jest": "^29.x",
  "supertest": "^6.x"
}
```

### Frontend
```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "emotion": "^11.x",
  "react-testing-library": "^14.x",
  "jest": "^29.x"
}
```

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
