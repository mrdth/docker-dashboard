# Tasks: Docker Container Metrics Dashboard

**Feature**: 001-container-metrics-dashboard  
**Branch**: 001-container-metrics-dashboard  
**Input**: Design documents from `/specs/001-container-metrics-dashboard/`  
**Organization**: Tasks grouped by user story for independent implementation and testing  
**Total Tasks**: 182 (organized across 8 phases, includes 3 performance validation tasks)

---

## Task Format Reference

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Markers**:
- `[P]` = Can run in parallel (different files, no dependencies)
- `[US#]` = User story label (e.g., [US1], [US2])
- Setup/Foundational phases have NO story labels
- All paths relative to repository root

---

## Implementation Strategy

### MVP Scope (User Story 1 only)
Focus on completing **User Story 1: View Container List and Status** first. This delivers immediate operational value and unblocks other stories.

### Parallel Opportunities
- All backend service implementations can run in parallel (different files)
- Component tests can run in parallel with component implementations
- Contract tests can be written and verified in parallel

### Independent Testing
Each user story phase includes:
1. Contract/integration tests (verify API contracts first)
2. Service/model implementations
3. Frontend component implementations
4. End-to-end verification

---

## Phase 1: Project Setup

**Purpose**: Initialize project structure, dependencies, and development environment

- [x] T001 Create monorepo structure with backend/ and frontend/ directories
- [x] T002 Initialize backend project: `mkdir -p backend && cd backend && npm init -y`
- [x] T003 Install backend core dependencies: express@5.1.0, express-ws@5.0.2, dockerode@4.0.9, dotenv@17.2.3, winston@3.18.3 in backend/package.json
- [x] T004 Install backend dev dependencies: typescript@5.9.3, @types/express, @types/node, ts-node, vitest@4.0.6, supertest@7.1.4 in backend/package.json
- [x] T005 Create backend directory structure: src/{models,services,api/routes,api/middleware,websocket,logger}, tests/{contract,integration,unit} in backend/
- [x] T006 Initialize frontend project: `npm create vite@latest frontend -- --template vue-ts` from repo root
- [x] T007 Install frontend dependencies: vue@3.5.13, vite@7.1.12, tailwindcss@4.1.4, reka-ui@2.6.0 in frontend/package.json
- [x] T008 Install frontend dev dependencies: @vue/test-utils@2.4.6, vitest@4.0.6, happy-dom, postcss@8.5.3, autoprefixer@10.4.21 in frontend/package.json
- [x] T009 [P] Create backend/tsconfig.json with target: ES2020, module: commonjs, esModuleInterop: true
- [x] T010 [P] Create frontend/tsconfig.json with target: ES2020, module: ESNext, jsx: vue
- [x] T011 [P] Create backend/.env with DOCKER_HOST=/var/run/docker.sock, NODE_ENV=development, LOG_LEVEL=debug, PORT=3000
- [x] T012 [P] Create frontend/.env with VITE_API_URL=http://localhost:3000
- [x] T013 Create backend/vitest.config.ts with environment: node, coverage reporter
- [x] T014 Create frontend/vitest.config.ts with environment: happy-dom, coverage reporter
- [x] T015 [P] Create backend/vite.config.ts (or use Vite for backend if preferred) or configure ts-node for development
- [x] T016 Create frontend/vite.config.ts with proxy to backend /api -> http://localhost:3000
- [x] T017 [P] Create frontend/tailwind.config.ts with content paths pointing to src/**/*.{vue,ts,tsx}
- [x] T018 [P] Create frontend/postcss.config.cjs with tailwindcss and autoprefixer plugins
- [x] T019 Configure backend npm scripts in backend/package.json: dev (ts-node), build, test, test:watch, test:unit, test:integration, test:contract, lint
- [x] T020 Configure frontend npm scripts in frontend/package.json: dev (vite), build, preview, test, test:watch, test:ui, lint

**Checkpoint**: Project structure initialized, dependencies installed, development environment ready

---

## Phase 2: Foundational Infrastructure

**Purpose**: Core backend infrastructure required by ALL user stories

**⚠️ CRITICAL**: Must complete before User Story implementations begin

### Logger Setup

- [x] T021 Create backend/src/logger/index.ts with Winston logger configuration (console transport for dev, JSON for production)
- [x] T022 [P] Create backend/src/logger/types.ts with LogLevel, LogContext, LogEntry type definitions

### Docker Service Foundation

- [x] T023 Create backend/src/services/docker.service.ts with constructor accepting DOCKER_HOST env var, verify Docker version on init
- [x] T024 [P] Create backend/src/models/index.ts with TypeScript interfaces: Container, ContainerMetrics, Port, LogEntry, Image matching data-model.md
- [x] T025 [P] Create backend/src/models/errors.ts with custom error classes: DockerDaemonError, ContainerNotFoundError, MetricsUnavailableError
- [x] T026 Implement docker.service.ts method: `async listContainers()` returning normalized Container[] with status mapping (running/stopped/paused/exited)
- [x] T027 [P] Implement docker.service.ts method: `async getContainer(id: string)` returning single Container with full details
- [x] T028 [P] Implement docker.service.ts method: `async getContainerStats(id: string)` returning ContainerMetrics with CPU%, memory, disk I/O, network I/O calculations
- [x] T029 [P] Implement docker.service.ts method: `async getPorts(id: string)` returning Port[] with protocol, containerPort, hostPort
- [x] T030 [P] Implement docker.service.ts method: `async getLogs(id: string)` returning LogEntry[] (last 100 lines)
- [x] T031 [P] Implement docker.service.ts method: `async getImageInfo(imageName: string)` returning Image with update availability info
- [x] T032 Implement docker.service.ts health check: `async verifyVersion()` ensuring Docker API v1.40+, throw DockerDaemonError if unavailable
- [x] T033 [P] Implement docker.service.ts error handling: wrap Docker API errors in custom error classes with clear messages

### Express App Initialization

- [x] T034 Create backend/src/main.ts with Express app setup, load env vars, initialize Docker service with health check
- [x] T035 [P] Create backend/src/api/middleware/error-handler.ts with global error middleware handling DockerDaemonError (503), validation errors (400), not found (404)
- [x] T036 [P] Create backend/src/api/middleware/cors.ts with CORS middleware allowing frontend origin from FRONTEND_URL env var
- [x] T037 Create backend/src/api/middleware/request-logger.ts with Winston logger middleware logging all requests with timestamp, method, path, response code

### WebSocket Foundation

- [x] T038 Create backend/src/websocket/manager.ts with WebSocket client set management, broadcast function, reconnection logic
- [x] T039 [P] Create backend/src/websocket/message-types.ts with type definitions for all WebSocket message types (metrics_update, container_status_changed, ping, pong, errors, etc)
- [x] T040 Create backend/src/websocket/handlers.ts with message handlers for client messages: ready, get_containers, get_container_detail, close, pong

### Frontend API Client Foundation

- [x] T041 Create frontend/src/types/index.ts with TypeScript interfaces matching backend models: Container, ContainerMetrics, Port, LogEntry, Image, WebSocketMessage
- [x] T042 [P] Create frontend/src/services/api.ts with HTTP client factory function and CORS-safe fetch wrapper (Content-Type, error handling)
- [x] T043 Create frontend/src/services/websocket.ts with WebSocket connection manager: connect(), disconnect(), send(), onMessage handlers, auto-reconnect with exponential backoff
- [x] T044 [P] Create frontend/src/composables/useWebSocket.ts exporting reactive websocket connection state and message handlers

### Frontend Component Foundations

- [x] T045 [P] Create frontend/src/main.ts as Vue app entry point with createApp, mount to #app
- [x] T046 Create frontend/src/App.vue with basic layout: header, sidebar, main content area, error banner component slot
- [x] T047 [P] Create frontend/src/components/ErrorBanner.vue displaying error messages with auto-dismiss, appears when Docker daemon unavailable or metrics fail
- [x] T048 [P] Create frontend/src/components/LoadingSpinner.vue showing animated spinner during data loads

**Checkpoint**: All foundational infrastructure in place - ready to implement User Stories in parallel

---

## Phase 3: User Story 1 - View Container List and Status (Priority: P1) 🎯 MVP

**Goal**: Operators can see all Docker containers with their names, IDs, and current status (running/stopped/paused/exited) in a live-updating list.

**Independent Test**: Open dashboard → see container list with status indicators, manually start/stop a container → status updates automatically on page refresh, dashboard handles empty container list gracefully

### Contract Tests for User Story 1

- [x] T049 [P] Write contract test GET /api/containers returns 200 with {containers: Container[], error: null} schema in tests/contract/containers.test.ts
- [x] T050 [P] Write contract test GET /api/containers returns 503 with DOCKER_DAEMON_UNAVAILABLE error when docker unavailable in tests/contract/containers.test.ts
- [x] T051 [P] Write contract test GET /api/containers filters by status query param (status=running) in tests/contract/containers.test.ts
- [x] T052 [P] Write contract test GET /api/containers filters by name query param (name=nginx) in tests/contract/containers.test.ts

### Integration Tests for User Story 1

- [x] T053 [P] Write integration test in tests/integration/docker.test.ts: DockerService.listContainers() returns array of containers with id, name, status, created, image fields
- [x] T054 [P] Write integration test in tests/integration/docker.test.ts: DockerService.listContainers() handles no containers gracefully (returns empty array)
- [x] T055 [P] Write integration test in tests/integration/docker.test.ts: Container status mapping normalizes Docker status strings to running/stopped/paused/exited

### Backend Implementation for User Story 1

- [x] T056 Implement backend/src/api/routes/containers.ts GET /api/containers endpoint returning all containers with optional name and status filters
- [x] T057 [P] Implement backend/src/api/routes/containers.ts request validation: validate status is one of running/stopped/paused/exited, validate name is non-empty string
- [x] T058 [P] Implement backend/src/api/routes/containers.ts error handling: catch DockerDaemonError and return 503, log errors with context
- [x] T059 Extend backend/src/main.ts to register /api/containers route and apply cors/error-handler middleware

### WebSocket Real-Time Updates for User Story 1

- [x] T060 Implement backend/src/websocket/manager.ts metrics collection loop: poll containers every 10s, detect status changes, broadcast container_status_changed message only on actual changes
- [x] T061 [P] Implement backend/src/websocket/handlers.ts handler for 'get_containers' message: return container_list with current containers
- [x] T062 Implement backend/src/websocket/routes.ts GET /api/metrics/stream WebSocket endpoint with express-ws, register handlers, start metrics collection on first client connect
- [x] T063 Extend backend/src/main.ts to initialize WebSocket routes and express-ws middleware
- [x] T064 [P] Implement ping/pong keep-alive in websocket manager (server sends ping every 30s, closes connection if no pong within 10s)

### Frontend Implementation for User Story 1

- [x] T065 Create frontend/src/pages/Dashboard.vue with container list display, integrate useContainers composable
- [x] T066 Create frontend/src/composables/useContainers.ts with reactive containers state, initial REST fetch, WebSocket container_status_changed listener for updates
- [x] T067 [P] Create frontend/src/components/ContainerListTable.vue displaying containers in HTML table: columns for name, ID, status, created time
- [x] T068 [P] Create frontend/src/components/ContainerStatusBadge.vue with status colors: green (running), gray (stopped), yellow (paused), red (exited)
- [x] T069 [P] Create frontend/src/components/ContainerEmptyState.vue showing "no containers" message with icon when list is empty
- [x] T070 Implement error handling in Dashboard.vue: display ErrorBanner when Docker daemon unavailable (docker_daemon_offline message), show retry button

### Component Tests for User Story 1

- [x] T071 [P] Write component test for ContainerStatusBadge.vue: verify badge shows correct color for each status
- [x] T072 [P] Write component test for ContainerListTable.vue: verify table renders with container rows, name/ID/status columns visible
- [x] T073 [P] Write component test for ContainerEmptyState.vue: verify empty message shown when containers array is empty
- [x] T074 Write component test for Dashboard.vue: verify container list displayed on load, error banner shown when docker_daemon_offline message received

**Checkpoint**: User Story 1 complete and independently testable. MVP can be deployed with container list visibility.

---

## Phase 4: User Story 2 - View Container Resource Metrics (Priority: P1)

**Goal**: Operators can see CPU, memory, and disk I/O metrics for each container with visual indicators for high resource usage.

**Independent Test**: Open dashboard with running container → see CPU% and memory% in container list, start CPU-intensive process in container → metrics increase visually, verify metrics update every ~10 seconds

### Contract Tests for User Story 2

- [x] T075 [P] Write contract test GET /api/containers/{id} returns 200 with metrics object including cpu, memory, diskIo, networkIo in tests/contract/containers.test.ts
- [x] T076 [P] Write contract test WebSocket metrics_update message includes timestamp, containerId, and metrics object in tests/contract/websocket.test.ts
- [x] T077 [P] Write contract test metrics_update sent every ~10 seconds for each running container in tests/contract/websocket.test.ts

### Integration Tests for User Story 2

- [x] T078 [P] Write integration test in tests/integration/docker.test.ts: DockerService.getContainerStats() returns metrics with cpu.percentage >= 0
- [x] T079 [P] Write integration test in tests/integration/docker.test.ts: CPU percentage calculation handles multi-core systems (can exceed 100%)
- [x] T080 [P] Write integration test in tests/integration/docker.test.ts: Memory percentage calculated as usage/limit * 100
- [x] T081 [P] Write integration test in tests/integration/docker.test.ts: Disk I/O read/write bytes tracked correctly

### Backend Implementation for User Story 2

- [x] T082 Implement backend/src/api/routes/containers.ts GET /api/containers/{id} endpoint returning Container with metrics property
- [x] T083 [P] Extend docker.service.ts: CPU percentage calculation accounts for system_cpu_usage delta and number of CPUs
- [x] T084 [P] Extend docker.service.ts: Memory percentage calculation as (usage / limit) * 100, handle cases where limit is 0
- [x] T085 [P] Extend docker.service.ts: Disk I/O calculations tracking readBytes, writeBytes, readBytesPerSec, writeBytesPerSec
- [x] T086 [P] Extend docker.service.ts: Network I/O calculations tracking receivedBytes, sentBytes, receivedBytesPerSec, sentBytesPerSec
- [x] T087 Implement metrics_update WebSocket message broadcast: include timestamp, containerId, and full metrics object every 10s

### Frontend Implementation for User Story 2

- [x] T088 Extend frontend/src/composables/useContainers.ts: add metrics field to Container, update from WebSocket metrics_update messages
- [x] T089 [P] Extend frontend/src/components/ContainerListTable.vue: add CPU%, Memory% columns, update on metrics_update
- [x] T090 [P] Create frontend/src/components/MetricsCell.vue displaying percentage with color coding: green (<50%), yellow (50-80%), red (>80%); handle CPU >100% (multi-core) and memory 0-100%; use responsive font scaling to prevent truncation (see plan.md High CPU/Memory Value Handling)
- [x] T091 [P] Create frontend/src/components/ContainerDetailView.vue displaying full metrics: CPU%, memory bytes/%, disk I/O rates, network I/O rates in detail panel
- [ ] T092 Implement metric update animation: smooth number transitions when metrics change (use CSS transitions or Vue transitions)
- [x] T093 Handle metrics unavailable state: show "N/A" with indicator when metrics.status === "unavailable"

### Component Tests for User Story 2

- [x] T094 [P] Write component test for MetricsCell.vue: verify color changes based on percentage (green <50%, yellow 50-80%, red >80%)
- [x] T095 [P] Write component test for ContainerDetailView.vue: verify all metric fields displayed (cpu, memory, diskIo, networkIo)
- [x] T096 Write component test for ContainerListTable.vue: verify metrics update when WebSocket metrics_update received

**Checkpoint**: User Story 2 complete. Dashboard now shows resource utilization for visibility into container performance.

---

## Phase 5: User Story 3 - View Container Port Mappings and Logs Summary (Priority: P2)

**Goal**: Operators can see which ports containers expose and view recent log activity for troubleshooting.

**Independent Test**: Open container detail → see port mappings (80:8080/tcp), see log lines with timestamps, verify "no ports" message when container has no exposed ports

### Contract Tests for User Story 3

- [x] T097 [P] Write contract test GET /api/containers/{id} includes ports array in tests/contract/containers.test.ts
- [x] T098 [P] Write contract test GET /api/containers/{id} includes logs array (last 100 lines) in tests/contract/containers.test.ts
- [x] T099 [P] Write contract test ports include protocol, containerPort, hostPort, hostIp fields in tests/contract/containers.test.ts

### Integration Tests for User Story 3

- [x] T100 [P] Write integration test in tests/integration/docker.test.ts: DockerService.getPorts() returns array of Port with protocol, ports, IP
- [x] T101 [P] Write integration test in tests/integration/docker.test.ts: getPorts() handles containers with no exposed ports (returns empty array)
- [x] T102 [P] Write integration test in tests/integration/docker.test.ts: DockerService.getLogs() returns last 100 lines with timestamp, message, stream
- [x] T103 [P] Write integration test in tests/integration/docker.test.ts: getLogs() returns all available logs (up to 100 lines)

### Backend Implementation for User Story 3

- [x] T104 Extend backend/src/api/routes/containers.ts GET /api/containers/{id} to include ports and logs in response
- [x] T105 [P] Implement docker.service.ts port retrieval: fetch from inspect() response, normalize protocol (lowercase), handle no ports case
- [x] T106 [P] Implement docker.service.ts log retrieval: call /containers/{id}/logs with tail=100, parse timestamps, filter to 1-hour window
- [x] T107 [P] Implement docker.service.ts log parsing: handle both stdout and stderr streams, track sequence numbers
- [x] T108 Handle edge case: container with no ports exposed shows empty array with clear handling in API response

### Frontend Implementation for User Story 3

- [x] T109 Create frontend/src/components/PortsList.vue displaying port mappings as: "8080:80/tcp" format, handle no ports case
- [x] T110 [P] Create frontend/src/components/LogsViewer.vue (implements "logs summary" feature) displaying all log lines in scrollable panel, timestamps left-aligned, messages monospace
- [x] T111 [P] Extend frontend/src/components/ContainerDetailView.vue to include PortsList and LogsViewer components
- [x] T112 Create frontend/src/pages/ContainerDetail.vue route for /containers/{id} showing full container info: name, status, metrics, ports, logs
- [x] T113 [P] Add router.ts with Vue Router config: routes for Dashboard, ContainerDetail pages
- [x] T114 Implement container detail fetch: GET /api/containers/{id} on page load, display ports and logs

### Component Tests for User Story 3

- [x] T115 [P] Write component test for PortsList.vue: verify port displayed in "8080:80/tcp" format
- [x] T116 [P] Write component test for PortsList.vue: verify "no ports exposed" message shown for empty ports array
- [x] T117 [P] Write component test for LogsViewer.vue: verify logs displayed with timestamps and monospace formatting

**Checkpoint**: User Story 3 complete. Operators can quickly access service ports and debug with log viewing.

---

## Phase 6: User Story 4 - Filter and Search Containers (Priority: P2)

**Goal**: Operators can filter containers by name and status to find specific containers quickly in large deployments.

**Independent Test**: Open dashboard → search "nginx" in search box → list filters to matching containers, click status filter "running" → shows only running containers, clear filters → shows all containers

### Contract Tests for User Story 4

- [x] T118 [P] Write contract test GET /api/containers?name=nginx returns only containers matching name substring in tests/contract/containers.test.ts
- [x] T119 [P] Write contract test GET /api/containers?status=running returns only containers with status=running in tests/contract/containers.test.ts
- [x] T120 [P] Write contract test GET /api/containers?name=nginx&status=running returns AND filter result in tests/contract/containers.test.ts

### Backend Implementation for User Story 4

- [x] T121 Extend backend/src/api/routes/containers.ts GET /api/containers to support name and status query parameters with validation
- [x] T122 [P] Implement filtering logic: case-insensitive substring match for name, exact match for status

### Frontend Implementation for User Story 4

- [x] T123 Create frontend/src/components/ContainerFilters.vue with search input for name and dropdown for status filter
- [x] T124 [P] Extend frontend/src/composables/useContainers.ts: add filters ref (name, status), implement client-side filtering of containers array
- [x] T125 [P] Extend frontend/src/pages/Dashboard.vue: add ContainerFilters component, bind filters to useContainers composable
- [x] T126 Implement search debounce: wait 300ms after user stops typing before filtering to reduce computation
- [x] T127 Add "clear filters" button: resets name and status filters to show all containers

### Component Tests for User Story 4

- [x] T128 [P] Write component test for ContainerFilters.vue: verify search input and status dropdown render
- [x] T129 [P] Write component test for ContainerFilters.vue: verify @input events emit filter changes
- [x] T130 Write component test for ContainerListTable.vue with filters: verify only matching containers displayed

**Checkpoint**: User Story 4 complete. Operators can efficiently find containers in large deployments.

---

## Phase 7: User Story 5 - Check for Container Image Updates (Priority: P3)

**Goal**: Operators can see which container images have available updates to plan upgrades and security patches.

**Independent Test**: Open dashboard → see "update available" indicator on containers with outdated images, hover indicator → shows available version number, verify update check status label (checked/unable_to_check)

### Contract Tests for User Story 5

- [ ] T131 [P] Write contract test GET /api/containers/{id} includes imageInfo with updateAvailable, latestVersion, registryStatus in tests/contract/containers.test.ts
- [ ] T132 [P] Write contract test imageInfo.updateAvailable=true only when latestVersion differs from currentVersion in tests/contract/containers.test.ts

### Backend Implementation for User Story 5

- [ ] T133 Implement backend/src/services/registry.service.ts for Docker Hub API integration: checkForUpdates(imageName, currentTag)
- [ ] T134 [P] Implement Docker Hub API call: GET https://hub.docker.com/v2/repositories/{imageName}/tags/{tag} to fetch latest version
- [ ] T135 [P] Implement update check caching: store last check timestamp, skip checks < 24 hours old
- [ ] T136 [P] Handle private registry detection: parse image name, identify private registries (gcr.io, quay.io, etc), set registryStatus="unable_to_check"
- [ ] T137 [P] Implement error handling: if Docker Hub unreachable, set registryStatus="unable_to_check", don't block container list
- [ ] T138 Extend docker.service.ts: call registry.service for image update info, include in Container response as imageInfo field
- [ ] T139 Implement background update check job: run every 24 hours per unique image, store results in memory cache with TTL

### Frontend Implementation for User Story 5

- [ ] T140 Create frontend/src/components/UpdateIndicator.vue displaying "update available" badge with latestVersion on hover/click
- [ ] T141 [P] Create frontend/src/components/UpdateIndicator.vue handling registryStatus: show "checked", "unable to check private registry", or "checking" states
- [ ] T142 Extend frontend/src/components/ContainerListTable.vue: add update indicator column, show badge for containers with updateAvailable=true
- [ ] T143 Extend frontend/src/components/ContainerDetailView.vue: show full image info including updateAvailable, latestVersion, lastChecked timestamp

### Component Tests for User Story 5

- [ ] T144 [P] Write component test for UpdateIndicator.vue: verify badge shown when updateAvailable=true
- [ ] T145 [P] Write component test for UpdateIndicator.vue: verify latestVersion shown on hover/click
- [ ] T146 [P] Write component test for UpdateIndicator.vue: verify "unable to check" message for private registries

**Checkpoint**: User Story 5 complete. Operators have visibility into image update availability.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, performance optimization, testing, documentation, and production readiness

**Performance Validation Gate**: No release without T180-T182 passing (validates SC-002, SC-003, SC-004)

### Error Handling & Recovery

- [ ] T147 Implement backend health check endpoint: GET /health returns {status: "ok", docker: "ok|error"} for monitoring
- [ ] T148 [P] Implement graceful degradation: when metrics unavailable, return metrics_unavailable message with 5s retry hint, don't crash dashboard
- [ ] T149 [P] Implement WebSocket reconnection with exponential backoff: 1s, 2s, 4s, 8s, max 30s
- [ ] T150 Implement frontend error boundary component: catches component rendering errors, displays error message, allows user to retry
- [ ] T151 [P] Implement metrics stale indicator: show "stale" flag on metrics older than 30 seconds without update

### Performance Optimization

- [ ] T152 Implement container list pagination: show 50 containers per page with pagination controls for large deployments
- [ ] T153 [P] Implement metric update throttling: send metrics_update max once per second to prevent frontend overwhelm
- [ ] T154 [P] Optimize WebSocket message size: compress metrics updates, send only changed fields (delta encoding)
- [ ] T155 Implement lazy loading: fetch container details on-demand (container detail page), not in list view
- [ ] T156 [P] Implement frontend component lazy loading: route chunks only loaded when accessed
- [ ] T157 Cache container list: keep 30s TTL in frontend for container list to reduce REST calls

### Documentation & Testing

- [ ] T158 Create backend/README.md: project structure, setup instructions, API endpoints, WebSocket protocol, running tests
- [ ] T159 [P] Create frontend/README.md: project structure, component guide, composables, running tests, Vite dev server
- [ ] T160 [P] Create CONTRIBUTING.md: development workflow, testing strategy, commit conventions
- [ ] T161 Create API_CONTRACTS.md: document all REST and WebSocket endpoints with examples
- [ ] T162 [P] Write unit test suite for all services: >=80% code coverage for docker.service, registry.service
- [ ] T163 Write integration test suite: verify end-to-end flows (list containers, view detail, update metrics)
- [ ] T164 [P] Write component test suite: >=70% coverage for all Vue components
- [ ] T165 Add JSDoc comments to all public functions in backend services
- [ ] T166 [P] Add TypeScript strict mode enabled, no `any` types in new code

### Production Readiness

- [ ] T167 Configure Docker healthcheck: container startup waits for Docker API connectivity check to pass
- [ ] T168 [P] Implement structured logging: all logs include timestamp, level, service, operation, context
- [ ] T169 [P] Configure log rotation: logs > 10MB rotated, keep 7 days history
- [ ] T170 Implement CORS security: validate FRONTEND_URL env var, reject cross-origin without explicit allowlist
- [ ] T171 [P] Add rate limiting: API endpoints rate limited to 100 req/min per IP (prevent abuse)
- [ ] T172 [P] Add request timeout: set 30s timeout on Docker API calls, handle gracefully with user message
- [ ] T173 Configure environment variables: all secrets and config via .env, never hardcoded
- [ ] T174 [P] Create docker-compose.yml: runs backend + frontend + Docker socket volume for local testing
- [ ] T175 [P] Create Dockerfile: backend production image with multi-stage build, minimal base image

### Deployment & Monitoring

- [ ] T176 Create deployment guide: instructions for running in Docker, setting DOCKER_HOST, volume mounts
- [ ] T177 [P] Implement metrics export: optional Prometheus-style metrics endpoint for monitoring (optional, low priority)
- [ ] T178 [P] Configure CI/CD: GitHub Actions runs tests, lints, builds on each PR
- [ ] T179 Create dashboard screenshot/demo: README includes GIF or video of dashboard in action

### Performance Validation & Verification (SC-002, SC-003, SC-004)

- [ ] T180 [P] Write performance test suite: measure dashboard load time with 50 containers, 100 containers; verify <3 seconds in tests/performance/load-time.test.ts (validates SC-003)
- [ ] T181 [P] Write metrics accuracy test: compare dashboard metrics vs Docker stats API for 10 running containers; verify ±5% accuracy in tests/performance/metrics-accuracy.test.ts (validates SC-002)
- [ ] T182 [P] Write search performance test: measure search response time with 100 containers and various filter combinations; verify <1 second in tests/performance/search-performance.test.ts (validates SC-004)

**Checkpoint**: Feature complete, tested, documented, and production-ready. All performance targets validated. Ready for release and user feedback.

---

## Task Execution Guidelines

### Recommended Execution Order (MVP First)

**Phase 1-2**: Sequential (infrastructure must complete first)
- 1 day: Setup + Foundational tasks

**Phase 3**: Focus here for MVP (User Story 1 - Container List)
- 1-2 days: Complete all T049-T074 tasks
- MVP can deploy after this phase

**Phase 4**: Parallel with Phase 3 (User Story 2 - Metrics)
- 1 day: T075-T096 tasks (can start while T074 finishing)

**Phase 5-6**: After MVP shipped (User Story 3-4)
- 1 day each: T097-T130 tasks

**Phase 7**: After core features (User Story 5 - Updates)
- 0.5 day: T131-T146 tasks

**Phase 8**: Throughout (Polish & Cross-Cutting)
- Continuous: Integrate T147-T182 as work progresses
- Testing added incrementally throughout all phases
- Performance validation tasks (T180-T182) run after Phase 7 complete

### Parallelization Strategy

**Services (all can run in parallel)**:
- T024-T032: Docker service methods
- T042-T043: Frontend API/WebSocket clients
- T078-T081: Integration tests

**Components (all can run in parallel)**:
- T067-T069: Container list components
- T089-T091: Metrics components
- T109-T112: Port/logs components

**Tests (can run in parallel with implementations)**:
- Write contract tests first (T049-T052)
- Then implement backends (T056-T063)
- Then write component tests (T071-T074)

### Success Criteria per Phase

**Phase 1-2**: `npm run dev` starts backend on 3000, frontend on 5173, no errors
**Phase 3 MVP**: Dashboard loads, shows running containers, updates on page refresh, Docker daemon unavailable handled gracefully
**Phase 4**: Metrics visible with colors, update every ~10s, handle unavailable state
**Phase 5**: Container detail page shows ports and logs
**Phase 6**: Search/filter works, clears, filters correct containers
**Phase 7**: Update indicators appear for outdated images
**Phase 8**: All tests pass, docs complete, CI/CD passing, production deployment ready

---

## Dependencies Between Tasks

```
Setup (Phase 1) → Foundational (Phase 2) → All User Stories (Phase 3-7) → Polish (Phase 8)

Within Phase 3:
- T049-T052 (contract tests) can start immediately
- T056-T058 (backend impl) requires T024-T033 complete
- T065-T070 (frontend impl) can run parallel
- All components ready before Phase 4

Within Phase 4:
- T075-T077 (tests) can write independently
- T082-T086 (backend metrics) requires T028 complete
- T088-T093 (frontend metrics) can run parallel with T082

User Stories independent after Phase 2:
- Phase 3 and Phase 4 can run in parallel
- Phase 5 and Phase 6 can run in parallel
- Phase 7 independent once Phase 2 complete
```

---

## Test Execution

### Run All Tests
```bash
# Backend
cd backend && npm run test

# Frontend
cd frontend && npm run test
```

### Run Tests by Type
```bash
# Contract tests only (API validation)
cd backend && npm run test:contract

# Integration tests only (Docker API)
cd backend && npm run test:integration

# Unit tests only (services, utilities)
cd backend && npm run test:unit

# Component tests only (Vue)
cd frontend && npm run test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test -- --coverage
```

---

## Progress Tracking

- **Phase 1**: 20 tasks (1 day)
- **Phase 2**: 24 tasks (2 days) 
- **Phase 3**: 26 tasks (2 days) ⭐ MVP here
- **Phase 4**: 22 tasks (2 days)
- **Phase 5**: 14 tasks (1 day)
- **Phase 6**: 8 tasks (1 day)
- **Phase 7**: 14 tasks (1 day)
- **Phase 8**: 32 tasks (3-5 days, runs concurrent with phases 3-7, includes T180-T182 performance validation)

**Total**: 182 tasks across 8 phases  
**MVP Scope**: Phases 1-3 (70 tasks = 5-6 days)  
**Full Feature**: All phases (182 tasks = 10-12 days including testing and performance validation)

---

## Next Steps

1. ✅ Run `/speckit.tasks` to generate this tasks.md
2. Start **Phase 1**: Initialize project structure
3. Continue **Phase 2**: Build foundational infrastructure
4. Implement **Phase 3**: MVP (User Story 1 - Container List)
5. After MVP ships, implement remaining User Stories in priority order
6. Throughout, integrate **Phase 8** polish and testing tasks
