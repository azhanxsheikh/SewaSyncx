# AGENTS.md — Sub-Agent Operating Rules

Defines specialised agent roles, their scopes, and the non-negotiable operating principles for automated work in this repository.

**Read [`CLAUDE.md`](CLAUDE.md) first** — it carries project architecture, commands, directory layout and code conventions. This document covers *who does what* and *the rules everyone follows*.

---

## 1. Universal Operating Principles

These apply to every agent, without exception.

### 1.1 Build integrity is a gate, not a goal

After **every** iteration:

```bash
pnpm type-check   # must report 0 errors
pnpm build        # must exit 0
```

`pnpm build` does not type-check — Vite strips types without validating them. A green build with broken TypeScript is a real and previously-observed failure mode here. Both commands are required.

Do not report work as complete without running both. Do not reference `pnpm test` or `pnpm lint`; neither exists in this project.

### 1.2 Zero hallucinated endpoints, tables or columns

- Every table, column, enum value, index and RPC name must exist in [`docs/DATABASE.md`](docs/DATABASE.md), or be added there in the same change.
- Never invent a Supabase API surface. If a needed table or function is not specified, stop and flag the gap rather than improvising a name.
- Every type in `src/types/domain.ts` is annotated with its backing table. Honour those annotations; when the UI shape and the schema diverge, the divergence is marked `SCHEMA-GAP` and must be resolved explicitly, not silently.

### 1.3 The visual layer is frozen

Never alter a `className` string, an inline `style`, element nesting, or sibling order. Tailwind v4 derives the CSS bundle from class literals, so a changed class changes the rendered output.

**Self-check:** if the emitted CSS asset hash changes and you did not intend a style change, you broke something. Compare class strings against `HEAD` before reporting done.

### 1.4 Schema alignment before code

Work flows from the specification outward: `docs/` → migration → types → hooks → components. An agent that writes a component against an imagined API creates work for the two agents downstream.

### 1.5 Scope discipline

Fix what you were asked to fix. Pre-existing dead code and technical debt are catalogued in `CLAUDE.md` §6 — leave them unless they block the task, and say so if they do.

---

## 2. Agent Roles

### 2.1 Database & Backend Agent

**Owns:** `supabase/migrations/`, RLS policies, PostGIS functions, `SECURITY DEFINER` RPCs, storage buckets, realtime publication, `pg_cron` jobs.

**Authoritative references:** `docs/DATABASE.md` (data dictionary, indexing, RPC contracts, RLS matrix, migration sequencing §14), `docs/WORKFLOWS.md` (state machine), `docs/RULES_AND_LOGIC.md` (constraints and thresholds).

**Must:**

- Follow the migration ordering in `docs/DATABASE.md` §14 — extensions, enums, independent tables, dependent tables, generated columns, constraints, indexes, triggers, RPCs, RLS, storage, realtime, cron, seed.
- Enable RLS on every table in `public`. A table without a policy denies by default; that is intentional, not an oversight.
- Enforce both concurrency invariants with the single GiST `EXCLUDE` constraint over `(technician_id, execution_window)` predicated on non-terminal status. Requires `btree_gist`. A status-only partial unique index is **insufficient** — it cannot see scheduling overlap.
- Enforce the 3-category skill cap with a row-locking constraint trigger (lock the parent `technician_profiles` row before counting). A `CHECK` cannot count sibling rows; a plain `BEFORE INSERT` trigger races under concurrent inserts.
- Route every lifecycle mutation through `accept_request()`, `advance_request_status()`, `cancel_request()`, `settle_job_payment()`, `file_dispute()`, `resolve_dispute_arbitration()`. Revoke direct `UPDATE` on `status`, `technician_id`, `accepted_at`, `final_price` at column level.
- Take `SELECT … FOR UPDATE` row locks in every RPC that mutates request state.
- Store spatial data as `GEOGRAPHY(Point, 4326)` only. Never add parallel `lat`/`lng` columns — that is a duplicated fact and a normalisation defect.
- Never persist an Aadhaar number. Store only the KUA/AUA verification token, masked last four, status and authority reference.

**Must not:** perform network I/O inside a trigger or any transaction on the request-serving path. Telemetry capture uses the `telemetry_outbox` table drained out-of-band.

**Verification:** apply migrations against an ephemeral local Supabase stack; assert constraints and policies with pgTAP; test concurrent `accept_request` calls and the sweep-versus-acceptance race explicitly.

---

### 2.2 Frontend & Integration Agent

**Owns:** `src/hooks/`, `src/fixtures/`, `src/types/`, component data wiring, the eventual Supabase client layer.

**Mission:** replace fixture-backed hooks with Supabase queries, mutations and Realtime subscriptions **without touching the visual layer**.

**Must:**

- Change data *sources*, never presentation. The hooks in `src/hooks/` exist precisely so this work has a seam that does not reach into JSX.
- Preserve the **synchronous** hook contract, or migrate every consumer in the same change. Returning `{ data, isLoading }` from a hook that previously returned an array breaks every call site and risks a blank first paint — this is the **zero-white-screen rule**.
- Preserve fallback behaviour exactly. `useFamilyMember` falls back to the first record; `useTechnicianProfile` returns `undefined` for an unknown id because callers render a "finding your technician" state. Changing these changes what users see.
- Respect the Rules of Hooks. Several screens early-return between branches (`ScheduledBooking.tsx`, `Rating.tsx`, `LiveTracking.tsx`). Hooks go at the top of the component; data needed only inside a conditional branch is imported directly from the fixture.
- Keep fixtures in place as the offline/demo path until the corresponding table, RLS policy and seed data all exist.
- Subscribe to Realtime only for the four published tables: `requests`, `technician_locations`, `chat_messages`, `request_cost_additions`. Client-side channel filters are a bandwidth optimisation, **not** a security boundary — RLS is.

**Must not:** introduce a state management library, restructure the screen router, or "modernise" components encountered along the way.

**Verification:** `pnpm type-check` and `pnpm build`; confirm the CSS asset hash is unchanged; diff `className` strings against `HEAD`.

---

### 2.3 QA & Auditing Agent

**Owns:** correctness review across concurrency, authorisation, lifecycle and the India-specific operational signals.

**Authoritative references:** `docs/RULES_AND_LOGIC.md` §9 (eleven operational vectors), `docs/WORKFLOWS.md` §1.2 (transition matrix), `docs/DATABASE.md` §12 (RLS matrix).

**Concurrency checks:**

- Two simultaneous `accept_request` calls on one request → exactly one succeeds, the other receives `already_claimed`.
- A technician with an active emergency cannot accept a second → `scheduling_conflict`.
- A technician holding a future scheduled booking cannot accept work overlapping that window; non-overlapping bookings are permitted.
- The `pg_cron` radius sweep and a concurrent acceptance cannot both win.
- A fourth category insert for one technician fails, including under concurrent inserts.

**Lifecycle checks:**

- Every transition absent from the §1.2 matrix is rejected with a diagnostic error, never silently coerced.
- Terminal states have no outgoing transitions; re-dispatch creates a new row with `superseded_from_request_id`.
- `arrived` and `in_progress` are not client-cancellable.

**Authorisation checks (run as each role):**

- A client cannot read another client's requests.
- A technician sees a pending request only when category-matched, within `search_radius_km`, unassigned, and un-throttled.
- The pre-acceptance PII exposure (`contact_name`, `contact_phone`, address, media) ends the moment a request is claimed.
- `rating`, `review_count` and `total_jobs` are not writable by participants.

**India-specific signal checks:**

- **Ghosting vs. honest cancellation** — telemetry confidence must clear *before* a ghosting penalty applies. A stationary position under degraded signal is a connectivity gap, not abandonment. Penalising a technician for a basement with no reception is a real-world failure, not a hypothetical.
- **Photo verification** — EXIF geotag within 150 m, capture time inside the execution window, pHash reuse detection. A single anomaly routes to human review and **never** triggers an automatic penalty.
- **Contextual delay** — gated-society (MyGate/NoBrokerHood) clearance, absent service lift and vernacular mismatch are subtracted from duration before any performance metric uses it.
- **Price variance** — settlement is refused while a cost addition is `pending`; variance above threshold requires justification; above the review threshold it is flagged.
- **Collusion** — pair-frequency deviation is a review signal only; never an automatic account action.
- **Fatigue** — caps are hard eligibility gates, and tighten under flagged extreme heat.

**Must not:** modify application code. This agent reports findings; fixes are routed to the owning agent.

---

## 3. Handoff Protocol

| From | To | Handoff artefact |
|---|---|---|
| Database & Backend | Frontend & Integration | Applied migration + generated types + the RLS predicate governing each new read |
| Frontend & Integration | QA & Auditing | Changed screens, the hooks touched, and confirmation the CSS hash is unchanged |
| QA & Auditing | Either | Findings with reproduction steps, referencing the `docs/` section that defines the expected behaviour |

Any agent encountering a specification gap stops and reports it. Nobody invents schema, thresholds or endpoints to keep moving.

---

## 4. Environment Notes

- Vite dev server may already be running on `$PORT`; changes hot-reload.
- Tailwind CSS v4 via `@tailwindcss/vite`. No `tailwind.config.js`, no PostCSS config. Theme customisation goes in `src/index.css` — CSS `@import` statements first, then `@font-face`, then defaults.
- Use double quotes for strings containing apostrophes (`"We're here"`), or escape them. An unescaped apostrophe in a single-quoted string breaks the build.
- Components are default-exported. JSX tags must be closed and braces balanced.
- `.figma/` is platform-managed tooling — do not edit or delete it.
