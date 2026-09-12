# CLAUDE.md — SewaSync Engineering Guide

Operational guide for working in this repository. Read this before making changes.

---

## 1. Project Architecture

**SewaSync** is a cooperative gig-services platform for household and community services in the Indian market: emergency (SOS) dispatch, scheduled bookings, live technician tracking, transparent pricing with approval-gated variance, and a full administrative operations console.

### Current state (what actually exists today)

- A **single Vite + React 19 SPA** rooted at `src/`.
- `apps/clients` and `apps/technician` are **thin mount wrappers** (~10 lines each). They mount `src/App.tsx` and `src/screens/TechnicianPortal.tsx` respectively against the same shared `src/` tree. They are *not* independent applications.
- Cross-surface state is simulated client-side by `src/context/DispatchContext.tsx` using `BroadcastChannel`, a `localStorage` mirror, and a 1-second poll against a dev-only bridge at `localhost:3000/__sos_dispatch`.
- **There is no backend.** No Supabase client, no authentication, no persistence. All data comes from typed fixtures under `src/fixtures/`.
- Geocoding calls public Nominatim directly from the browser; routing uses the public OSRM demo server. Both are prototype-only and must be proxied before production.

### Target state

- Supabase backend: PostgreSQL 15 + PostGIS, GoTrue auth, Realtime subscriptions, Storage.
- Authorisation enforced in the database via Row-Level Security, not in the client.
- Lifecycle transitions performed exclusively through `SECURITY DEFINER` RPCs — never direct table writes.
- Eventual migration of the two front-end surfaces to Next.js App Router with middleware session guards.
- Redis (Sentinel) for ephemeral caches and queues; S3-compatible object storage for the analytics tier.

The full target design is specified in `./docs/` — see §5.

---

## 2. Commands

Package manager is **pnpm** (see `.mise.toml`: Node 22, pnpm 10.34.3).

| Command | Purpose |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Run both surfaces in parallel (clients on :3002, technician on :3000) |
| `pnpm dev:client` | Run the client surface only |
| `pnpm build` | Production build via Vite — **must exit 0 before and after every change** |
| `pnpm preview` | Serve the production build locally |
| `pnpm type-check` | `tsc --noEmit` — **must report 0 errors** |
| `pnpm format` | Format with oxfmt |

**Important:** `pnpm build` does **not** type-check. Vite strips types without checking them, so a build can pass while TypeScript is broken. Always run `pnpm type-check` as a separate gate.

There is no test runner and no linter configured. Do not reference `pnpm test` or `pnpm lint` — they do not exist. `oxfmt` is a formatter only.

---

## 3. Directory Structure

```text
.
├── docs/                        # Architecture & design specifications (see §5)
├── apps/
│   ├── clients/                 # Thin mount wrapper → src/App.tsx (port 3002)
│   └── technician/              # Thin mount wrapper → src/screens/TechnicianPortal.tsx (port 3000)
├── src/
│   ├── App.tsx                  # In-memory screen router for the client surface
│   ├── main.tsx                 # Root Vite entry (build entrypoint via index.html)
│   ├── index.css                # Tailwind v4 entry + global styles
│   ├── components/              # Shared presentational components
│   │   ├── BottomNav.tsx        #   Client tab bar
│   │   ├── Header.tsx           #   Screen header + SOSProgress stepper
│   │   ├── ErrorBoundary.tsx    #   Root boundary (used by apps/clients)
│   │   ├── SOSRouteErrorBoundary.tsx
│   │   ├── MapView.tsx          #   Static SVG map illustration
│   │   ├── LeafletLocationMap.tsx  # Real Leaflet/OSM map + reverse geocoding
│   │   ├── TechnicianDirectionsMap.tsx  # OSRM routing + Google Maps deep link
│   │   └── TechnicianCard.tsx
│   ├── context/
│   │   └── DispatchContext.tsx  # Client↔technician state bridge (prototype transport)
│   ├── fixtures/                # ← ALL mock data lives here. Typed, no JSX.
│   │   ├── services.fixture.ts  #   Catalogue, offerings, priorities, symptoms, questions
│   │   ├── technicians.fixture.ts
│   │   ├── requests.fixture.ts  #   Booking history, timelines, execution steps
│   │   ├── account.fixture.ts   #   Profile, addresses, family members, notifications
│   │   ├── billing.fixture.ts   #   Payment methods, invoice, cost additions, review tags
│   │   └── content.fixture.ts   #   Chat, quick replies, static home content
│   ├── hooks/                   # ← Read contracts. The Supabase swap seam.
│   │   ├── useServiceCatalog.ts
│   │   ├── useTechnicians.ts    #   useTechnicianProfile(), usePrimaryTechnician()
│   │   ├── useRequests.ts       #   useRequests(), useFilteredRequests()
│   │   └── useAccount.ts        #   useSavedAddresses(), useFamilyMembers(), …
│   ├── screens/
│   │   ├── Home.tsx  Profile.tsx  BookingHistory.tsx  Notifications.tsx
│   │   ├── FamilySOS.tsx  ScheduledBooking.tsx  TechnicianPortal.tsx
│   │   ├── sos/                 #   19-screen emergency flow
│   │   └── technician/          #   Dashboard, incoming alert, active job, history
│   ├── types/
│   │   ├── domain.ts            #   Entity contracts, annotated with their DB tables
│   │   ├── dispatch.ts          #   Runtime dispatch/job types
│   │   └── navigation.ts        #   Screen union for the in-memory router
│   └── utils/geocoding.ts
├── supabase/                    # Supabase CLI project (config only; no migrations yet)
├── index.html                   # Root Vite HTML shell
└── vite.config.ts               # React + Tailwind v4 + Figma plugins; `@` → ./src
```

---

## 4. Code Conventions & Invariants

### 4.1 TypeScript

- `strict: true` is on. Do not weaken it, and do not introduce `any` to silence an error.
- `pnpm type-check` must report **0 errors** before any change is considered done.
- Path alias `@/*` → `./src/*` is configured in both `tsconfig.json` and `vite.config.ts`, but the existing codebase uses **relative imports**. Match the surrounding file.
- Watch for missing separators in single-line type literals (`{ a: string; b: string }`). Vite strips types without checking, so malformed annotations compile silently and only surface under `tsc`.

### 4.2 Components — styling is frozen

**The visual layer is treated as a fixed contract.** This codebase was exported from Figma and its appearance is the product.

- **Never** alter, reorder, reformat, or "tidy" a `className` string. Tailwind v4 generates CSS from these literals — changing one changes the rendered output and the CSS bundle hash.
- Never change inline `style` objects, element nesting, or the order of siblings.
- When replacing repeated markup with a `.map()`, the rendered DOM must be identical, including every class.
- Components take a typed `Props` interface, are default-exported, and receive `navigate: (s: Screen) => void` for routing.
- The codebase mixes quote and semicolon styles per file. Match the file you are editing; do not run the formatter across untouched files.

**Verification for any UI-adjacent change:**

```bash
pnpm type-check && pnpm build
```

The emitted CSS asset hash should be **unchanged** if you did not intend a style change. A changed CSS hash means a class string moved.

### 4.3 Data handling

- **No hardcoded data arrays or object literals inside JSX or component bodies.** All mock data lives in `src/fixtures/*.fixture.ts` and is strongly typed against `src/types/domain.ts`.
- Components read data through the hooks in `src/hooks/`, not by importing fixtures directly — the hooks are the seam where Supabase queries will land.
  - Exception: data consumed inside a conditional branch (after an early `return`) must be imported directly from the fixture, because calling a hook there would violate the Rules of Hooks. `ScheduledBooking.tsx` is the existing example.
- Hooks currently return data **synchronously**. Preserve that contract when wiring Supabase: introducing a loading state would require touching JSX in every screen and risks a blank first paint (the zero-white-screen rule).
- Every type in `src/types/domain.ts` is annotated with the database table it maps to. Divergences are marked `SCHEMA-GAP` — read them before changing a shape.

### 4.4 Business invariants

These come from `docs/RULES_AND_LOGIC.md` and must hold in any backend work:

| Invariant | Rule |
|---|---|
| **Skill cap** | A technician registers **1–3 service categories** (not offerings). Enforced by a row-locking constraint trigger, because a `CHECK` cannot count sibling rows and a plain `BEFORE INSERT` trigger races. |
| **Single active job** | A technician holds **at most one active emergency** at any instant. |
| **Calendar non-overlap** | A technician may hold multiple accepted *scheduled* bookings only if no two execution windows intersect, and none intersects an active emergency. |
| **Enforcement** | Both concurrency rules are enforced by one GiST `EXCLUDE` constraint over `(technician_id, execution_window)` predicated on non-terminal status — not by application logic. |
| **Price variance** | `final_price > estimated_total` requires a structured reason **and** client approval via `request_cost_additions` before the job can complete. A lower final price needs no approval. |
| **Terminal immutability** | Terminal requests are never reopened. Re-dispatch creates a new row referencing `superseded_from_request_id`. |

### 4.5 Request lifecycle

The canonical enum has **nine** states — the eight-state happy path plus `unfulfilled`:

```text
pending → accepted → en_route → arrived → in_progress → completed
   │          │
   │          └────────────→ declined      (assigned technician withdraws)
   ├──────────────────────→ cancelled      (client withdraws; also from accepted/en_route)
   └──────────────────────→ unfulfilled    (30 km radius exhausted, system-driven)
```

- Terminal: `completed`, `cancelled`, `declined`, `unfulfilled`. No transitions originate from them.
- `arrived` and `in_progress` are **not** client-cancellable — withdrawal there is a dispute.
- A technician declining a broadcast request writes a private dismissal row; it does **not** change global state for other technicians.
- The frontend's legacy `DispatchStatus` / `JobStatus` / `ExecutionStep` triple is superseded by this single enum. Mapping table: `docs/WORKFLOWS.md` §1.3.

---

## 5. Operational Documentation

Design authority lives in `./docs/`. Consult these before backend or schema work — do not invent schema.

| Document | Contents |
|---|---|
| [`docs/SRS.md`](docs/SRS.md) | ISO/IEC/IEEE 29148 requirements: functional (FR-*), non-functional (NFR-*), traceability, deferred scope |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Deployment topology, tech stack, Redis/Docker/CI-CD, telemetry pipeline, 12 ADRs |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Full data dictionary (~40 tables), ERDs, enums, indexing, partitioning, RPC contracts, RLS/RBAC matrix, migration sequencing |
| [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md) | State machine + transition matrix, dispatch algorithm, radius expansion, settlement, mediation |
| [`docs/RULES_AND_LOGIC.md`](docs/RULES_AND_LOGIC.md) | Constraints, Bayesian rating maths, capability scoring, fairness, 11 India-specific operational vectors, parameter registry |
| [`docs/ADMIN_CONSOLE.md`](docs/ADMIN_CONSOLE.md) | 4-pillar operations console, roles, audit model, fraud surfaces |

Root `ARCHITECTURE.md` predates `docs/` and describes a Next.js monorepo that does not exist. Treat `docs/` as authoritative.

---

## 6. Known Technical Debt

Pre-existing, deliberately left in place (fixing them requires product decisions and risks behaviour change):

- Unused locals: `goBack` (App), `taxes` (ScheduledBooking), `progress` (LiveTracking), `priorityMultiplier` (Pricing), `currentStage` (ServiceInProgress). `pnpm type-check --noUnusedLocals` lists them.
- Unused props: `onBack` (FamilySOS), `navigate` (Notifications), `selectedService` (PriorityTriage).
- `request_answers` has a schema and fixtures, but `Questionnaire.tsx` still discards its answers in local state — they never reach `DispatchContext`. Wiring required.
- The dev bridge (`localhost:3000/__sos_dispatch`) is prototype transport and disappears with Supabase Realtime.
- Public Nominatim / OSRM endpoints have no SLA or rate limiting; proxy before production.
