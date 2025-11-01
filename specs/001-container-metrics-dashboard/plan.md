# Implementation Plan: Docker Container Metrics Dashboard

**Branch**: `001-container-metrics-dashboard` | **Date**: 2025-11-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-container-metrics-dashboard/spec.md`

**Note**: This plan is filled in by the `/speckit.plan` command.

## Summary

Build a web-based dashboard for Docker container management and monitoring. The MVP focuses on real-time visibility into container status, resource consumption (CPU, memory, disk I/O), port mappings, and recent logs. The dashboard uses WebSocket/SSE for real-time metric delivery with graceful degradation to REST polling. Supports single Docker host with up to 100 containers. No authentication required for MVP (local network access).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (backend), React 18+ (frontend)  
**Primary Dependencies**: 
- Backend: Express.js (REST API + WebSocket), Docker SDK (node package), dotenv
- Frontend: React, WebSocket client, CSS-in-JS (emotion or styled-components)  
**Storage**: N/A (no persistence; metrics are real-time only)  
**Testing**: Jest (unit/integration), React Testing Library (component tests), Supertest (API contract tests)  
**Target Platform**: Web application (modern browsers: Chrome, Firefox, Safari, Edge)  
**Project Type**: Web application (separate backend + frontend)  
**Performance Goals**: 
- Dashboard loads in <3 seconds (50+ containers)
- Metrics update every 10 seconds via WebSocket
- Searches return results in <1 second
- 95th percentile API latency <200ms  
**Constraints**: 
- Optimized for up to 100 containers
- No historical data storage (current metrics only)
- Docker API v1.40+ required
- Modern browser support (last 2 versions)  
**Scale/Scope**: 
- Single Docker host per dashboard instance
- Up to 100 concurrent containers
- Real-time metrics collection from Docker stats API
- Image update checks via Docker Hub

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Specification-First Development ✅
- Feature has approved specification (spec.md) with user stories and requirements
- All clarifications resolved before implementation begins
- **Status**: PASS

### Principle II: Test-First Implementation ✅
- Plan explicitly specifies testing strategy (contract, integration, component tests)
- Task generation will enforce Red-Green-Refactor cycle
- Every user story will include contract tests before implementation
- **Status**: PASS - will be enforced in task generation phase

### Principle III: Independent User Story Delivery ✅
- 5 user stories designed independently: Container status (P1), Resource metrics (P1), Port/logs (P2), Search/filter (P2), Image updates (P3)
- Each story can be tested and deployed independently
- Dependencies analyzed: Stories 3-5 depend on foundational metrics from Stories 1-2
- **Status**: PASS

### Principle IV: Code Quality & Maintainability ✅
- Web application structure enforces separation of concerns (backend/frontend)
- All public functions will require documentation
- Configuration will be environment-based (.env files)
- **Status**: PASS - enforceable through code review

### Principle V: Observability & Debugging ✅
- Backend will implement structured logging (Winston or similar)
- Real-time metric updates provide operational visibility
- Error banner provides user feedback on connection status
- Docker daemon unavailability shows clear error messages
- **Status**: PASS - will be implemented in backend services

### Principle VI: Explicit Error Handling & Validation ✅
- API boundaries will validate all inputs (container IDs, filter parameters)
- Error responses specify Docker daemon errors, metric unavailability, registry failures
- Graceful degradation: WebSocket fallback to polling, Docker Hub fallback for image checks
- **Status**: PASS - specified in requirements FR-008, FR-012, assumption #5

**Constitution Check Result**: ✅ ALL PRINCIPLES ALIGNED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

Web application with separate backend and frontend projects:

```text
backend/
├── src/
│   ├── models/
│   │   ├── container.ts
│   │   ├── metrics.ts
│   │   └── image.ts
│   ├── services/
│   │   ├── docker.service.ts
│   │   ├── metrics.service.ts
│   │   └── registry.service.ts
│   ├── api/
│   │   ├── routes/
│   │   │   ├── containers.ts
│   │   │   ├── metrics.ts
│   │   │   └── health.ts
│   │   └── middleware/
│   │       ├── errorHandler.ts
│   │       └── validation.ts
│   ├── websocket/
│   │   ├── handlers.ts
│   │   └── manager.ts
│   ├── logger/
│   │   └── index.ts
│   └── main.ts
└── tests/
    ├── contract/
    │   ├── containers.test.ts
    │   ├── metrics.test.ts
    │   └── health.test.ts
    ├── integration/
    │   ├── docker.integration.test.ts
    │   └── metrics.integration.test.ts
    └── unit/
        ├── services/
        └── models/

frontend/
├── src/
│   ├── components/
│   │   ├── ContainerList.tsx
│   │   ├── MetricsPanel.tsx
│   │   ├── PortInfo.tsx
│   │   ├── LogViewer.tsx
│   │   └── ErrorBanner.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   └── ContainerDetail.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   └── docker.service.ts
│   ├── hooks/
│   │   ├── useContainers.ts
│   │   └── useMetrics.ts
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── index.ts
│   └── App.tsx
└── tests/
    ├── components/
    │   ├── ContainerList.test.tsx
    │   └── MetricsPanel.test.tsx
    └── integration/
        └── dashboard.integration.test.tsx
```

**Structure Decision**: Web application structure with separate backend (Node.js/Express) and frontend (React). Backend handles Docker API communication, metrics aggregation, and WebSocket/REST API. Frontend provides reactive UI with real-time updates. Both projects are independently buildable and testable, enabling parallel development.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
