# Zatoshi

A full-stack, microservices-based e-commerce platform built with Turborepo, Next.js 14, tRPC, MongoDB, and Redis. Features a customer-facing storefront, admin dashboard, background job worker, and comprehensive monitoring stack.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────-┐
│                      User Browser                        │
└──────────┬──────────────────────────────────┬────────────┘
           │                                  │
    ┌──────▼──────-┐                  ┌───────▼───────┐
    │  Storefront  │                  │     Admin     │
    │  :3000/web   │                  │  :3003/admin  │
    │  Next.js 14  │                  │  Next.js 14   │
    └──────┬───────┘                  └───────┬───────┘
           │ HTTP/tRPC                        │ HTTP/tRPC
           ▼                                  ▼
    ┌──────────────────────────────────────────────-┐
    │            API Gateway (:3001/api)            │
    │      Express + tRPC + Zod Validation          │
    │     Auth │ Products │ Orders │ Cart │ Upload  │
    └────┬─────────┬──────────┬──────────┬──────────┘
         │         │          │          │
    ┌────▼──┐ ┌───▼────┐ ┌───▼───┐ ┌───▼──────┐
    │MongoDB│ │ Redis  │ │ MinIO │ │  Worker  │
    │  :7   │ │ :6379  │ │:9000  │ │ :3002    │
    │  RS   │ │Cache/  │ │Images │ │ Event    │
    │       │ │Streams │ │Avatars│ │ Consumer │
    └───────┘ └────────┘ └───────┘ └──────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Monorepo** | Turborepo + pnpm workspaces | Shared configs, packages, build orchestration |
| **Frontend** | Next.js 14 App Router + TypeScript | Storefront and admin dashboard |
| **Styling** | Tailwind CSS + CSS custom properties | Design system with dark/light mode |
| **Backend** | Express + tRPC + Zod | Type-safe API gateway |
| **Database** | MongoDB 7 (replica set) | Document store, per-service collections |
| **Cache** | Redis 7 | Sessions, cart, rate limiting, pub/sub |
| **Object Storage** | MinIO | Product images, user avatars |
| **Auth** | JWT (access/refresh) + Argon2 + RBAC | Customer and admin authentication |
| **Events** | Redis Streams + Outbox Pattern | Reliable async event processing |
| **Testing** | Vitest + Playwright | Unit/integration + e2e testing |
| **Monitoring** | Prometheus + Grafana | Metrics collection and visualization |
| **DevOps** | Docker Compose, multi-stage Dockerfiles, Makefile | Local development and deployment |

---

## Prerequisites

- **Node.js** 20.x or later
- **pnpm** 9.x or later (`npm install -g pnpm`)
- **Docker** 24.x or later with Docker Compose v2
- **Git**

---

## Quick Start

```bash
# 1. Clone and enter the repository
git clone <repo-url> && cd <project-directory>

# 2. Copy environment variables
cp .env.example .env

# 3. Install dependencies
pnpm install

# 4. Start all services (Docker Compose)
make dev
```

The first build will take a few minutes. Once ready, visit:

| Service | URL | Description |
|---------|-----|-------------|
| **Storefront** | http://localhost:3000 | Customer-facing shopping experience |
| **Admin Dashboard** | http://localhost:3003 | Admin product/order/user management |
| **API Gateway** | http://localhost:3001/trpc | tRPC API (browser-friendly playground) |
| **Grafana** | http://localhost:3005 | Monitoring dashboards (admin/admin) |
| **Prometheus** | http://localhost:9090 | Metrics collection |
| **MinIO Console** | http://localhost:9001 | Object storage admin (minioadmin/minioadmin) |

### Stopping and Resetting

```bash
make down        # Stop all services and remove volumes
make db-reset    # Reset databases (MongoDB + Redis + MinIO)
make logs        # Tail logs from all services
```

---

## Project Structure

```
Zatoshi/
├── apps/
│   ├── web/                    # Next.js storefront (port 3000)
│   │   ├── src/app/            # App Router pages
│   │   │   ├── products/       # Product listing + detail
│   │   │   ├── cart/           # Shopping cart
│   │   │   ├── checkout/       # Multi-step checkout
│   │   │   ├── orders/         # Order history
│   │   │   └── auth/           # Login/register
│   │   └── tests/e2e/          # Playwright e2e tests
│   ├── api/                    # API gateway — tRPC + Express (port 3001)
│   │   ├── src/
│   │   │   ├── routers/        # tRPC procedure definitions
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Auth, rate-limit, correlation, error
│   │   │   ├── trpc/           # tRPC instance and context
│   │   │   └── utils/          # JWT, password, MinIO helpers
│   │   └── tests/              # Vitest integration tests
│   ├── worker/                 # Background job processor (port 3002)
│   │   ├── src/
│   │   │   ├── consumers/      # Redis Stream consumers
│   │   │   ├── handlers/       # Event handlers (order, payment, user)
│   │   │   ├── services/       # Email, inventory, order services
│   │   │   └── utils/          # Retry, DLQ helpers
│   │   └── tests/              # Vitest unit tests
│   └── admin/                  # Admin dashboard (port 3003)
│       ├── src/app/
│       │   ├── products/       # Product CRUD
│       │   ├── orders/         # Order management
│       │   ├── categories/     # Category management
│       │   ├── users/          # User management
│       │   └── login/          # Admin authentication
│       └── tests/e2e/          # Playwright e2e tests
├── packages/
│   ├── types/                  # Zod schemas + TypeScript types
│   ├── utils/                  # Logger, health checks, factories
│   ├── config/                 # ESLint, TSConfig, Tailwind presets
│   ├── ui/                     # Shared React components
│   ├── events/                 # Event schemas (versioned)
│   └── metrics/                # Prometheus client setup
├── docker/
│   ├── Dockerfile.*            # Multi-stage Dockerfiles
│   ├── prometheus/             # Prometheus config + alert rules
│   ├── grafana/                # Grafana dashboards + datasources
│   └── scripts/                # Init scripts (MongoDB, MinIO)
├── docker-compose.yml          # Main services (9 containers)
├── Makefile                    # Common commands
├── AGENTS.md                   # Agent coding guidelines
└── design.md                   # Design system specification
```

---

## Available Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start all services via Docker Compose |
| `make down` | Stop services and remove volumes |
| `make db-reset` | Reset MongoDB + Redis + MinIO data |
| `make test` | `turbo test` across all services |
| `make build` | `turbo build` for production |
| `make logs` | Tail all service logs |
| `make lint` | `turbo lint` — ESLint across all packages |
| `make lint-fix` | Auto-fix lint issues across workspace |
| `pnpm turbo run test --filter=apps/web` | Test only the web app |
| `pnpm vitest run --reporter=verbose` | Run all Vitest tests (verbose) |
| `pnpm vitest run <path>` | Run a single test file |
| `pnpm vitest run -- --update` | Update snapshots |
| `pnpm exec playwright test` | Run all e2e tests |
| `pnpm exec playwright test <path>` | Run a single e2e test file |
| `pnpm exec playwright test --debug` | Run e2e in debug mode |
| `pnpm turbo typecheck` | TypeScript compiler checks only |
| `pnpm dedupe` | Deduplicate lockfile |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://mongodb:27017/ecommerce` | MongoDB connection string (replica set) |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `MINIO_ENDPOINT` | `http://minio:9000` | MinIO S3-compatible endpoint |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `JWT_SECRET` | _(required)_ | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | _(required)_ | Secret for signing refresh tokens |
| `API_INTERNAL_KEY` | _(required)_ | Internal service-to-service auth |
| `NODE_ENV` | `development` | Runtime environment |
| `LOG_LEVEL` | `debug` | Pino log level |

See `.env.example` for the full list.

---

## Key Design Decisions

- **Outbox Pattern**: State-change events are written to MongoDB, then a worker polls and publishes to Redis Streams, ensuring at-least-once delivery
- **tRPC**: End-to-end type safety from the API to the frontend with automatic TypeScript inference
- **Per-Service Collections**: Each microservice owns its MongoDB collections — no cross-service database access
- **Idempotency**: All mutation endpoints support `Idempotency-Key` headers to prevent duplicate processing
- **Rate Limiting**: Redis-backed sliding window rate limiter on auth (5 req/min) and general API (100 req/min)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System architecture, data flows, service matrix |
| [API Reference](docs/api.md) | All tRPC procedures with examples |
| [Testing](docs/testing.md) | Test results, faults, and coverage |
| [Monitoring](docs/monitoring.md) | Prometheus, Grafana, alerts setup |
| [Onboarding](docs/onboarding.md) | New developer setup guide |
| [Design System](design.md) | Design tokens, components, pages |
| [Agent Guide](AGENTS.md) | Agentic coding tool guidelines |
| [ADR](docs/adr/2026-07-05-ecommerce.md) | Architecture Decision Records |

---

## Event Flow

```
order.placed → payment.processed → inventory.updated → email.sent
```

Events flow through the outbox pattern:
1. API writes event to MongoDB `outbox` collection
2. Worker polls `outbox` for `pending` events
3. Worker publishes to Redis Stream (`ecommerce:events`)
4. Consumer groups process events and acknowledge them
5. Failed events are retried (max 3) and sent to a Dead Letter Queue

---

## License

Proprietary — internal use.
