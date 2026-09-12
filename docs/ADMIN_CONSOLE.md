# Admin Operations, Mediation & Control Console — SewaSync

**Document ID**: SWS-ADMIN-001
**Version**: 1.0
**Status**: Baseline for review
**Scope**: The four-pillar operations console — structure, views, roles, override semantics and fraud-monitoring surfaces.

> Data structures: `DATABASE.md`. Detection algorithms and thresholds: `RULES_AND_LOGIC.md` §9. Lifecycle semantics: `WORKFLOWS.md`.

---

## 1. Purpose and Positioning

The console is where the platform's operational risk is actually managed. In an early-stage Indian home-services marketplace, the dominant cost centres are not dispatch sub-optimality — they are no-shows, disputed charges, cash and UPI reconciliation gaps, and fraud. This surface exists to make those tractable by a small operations team.

Three design commitments follow from that:

1. **Every override is audited.** Power without a record is how operations teams become the largest unmonitored attack surface in a platform.
2. **Read access is broad; write access is narrow and mediated.** Staff see everything; they change things only through the same `SECURITY DEFINER` RPCs that govern participants, plus staff-only functions.
3. **The console does not bypass the state machine.** A forced status advance is still a valid transition in `WORKFLOWS.md` §1.2 — it is simply performed by an administrator, recorded as such via `actor_role='admin'`.

---

## 2. Roles and Permission Model

| Role | Authority | Constraint |
|---|---|---|
| `support_moderator` | Full read across the platform; triage, claim and resolve disputes; apply throttles; record verification outcomes; propose financial actions | Cannot unilaterally execute irreversible high-value actions (payouts and refunds above threshold, permanent suspension) |
| `super_admin` | All of the above, plus unrestricted override authority and configuration control | High-value actions still require maker-checker confirmation |

**Maker-checker**: actions exceeding a configured monetary or severity threshold require proposal by one staff member and confirmation by a second. Both identities are recorded on the resulting `admin_actions` row.

**Role resolution**: staff are recorded in `platform_staff`, not as a third `users.role` value. Every "read all" capability in the RLS matrix (`DATABASE.md` §12) is a predicate checking membership of that table — a deliberate, documented widening of the otherwise participant-scoped security model.

---

## 3. Navigation Taxonomy

```text
Admin Console
├── The Mediator ................... disputes, escalations, live intervention
│   ├── Escalation Inbox
│   ├── Dual-Party Timeline Viewer
│   ├── Dispute Arbitration Workbench
│   └── Override Console
├── The Analyzer ................... telemetry, quality, outlier detection
│   ├── Unit Economics Dashboard
│   ├── Cancellation & SLA Breakdown
│   ├── Anomaly Clusters
│   └── Technician Capability Rollups
├── The Controller ................. access, verification, regulatory gates
│   ├── Onboarding Verification Pipeline
│   ├── Tooling & Equipment Registry
│   ├── Insurance & Liability Tiers
│   └── Risk & Penalty Engine
└── Financial Guard ................ margins, pricing, cash flows
    ├── Fare Variance Monitor
    ├── Commission & Surge Controls
    ├── Settlement Reconciliation (UPI / Cash)
    └── Escrow & Payout Ledger
```

---

## 4. Pillar 1 — The Mediator

### 4.1 Escalation Inbox

The default landing view. A single prioritised queue rather than separate per-type lists, because an operator's real question is "what needs me most urgently", not "show me disputes".

| Queue source | Entry trigger | Default priority |
|---|---|---|
| Active disputes | `disputes.status` non-terminal | By reason severity, then age |
| Ghosting alerts | `technician_ghosted` reason recorded, telemetry confidence cleared | High |
| Price-variance reviews | Variance above review threshold | Medium |
| Photo-verification flags | Geotag/pHash anomaly | Medium |
| Distress signals | Safety-category dispute, harassment report | **Critical — top of queue unconditionally** |
| Unfulfilled clusters | Repeated `unfulfilled` in one area/category | Low, aggregated |

Backed by `disputes_inbox_idx` and read from the **read replica**, except distress signals which read primary.

### 4.2 Dual-Party Timeline Viewer

A single chronological reconstruction of one job, interleaving four normally-separate sources:

| Lane | Source |
|---|---|
| Lifecycle | `request_status_events` (with `actor_role` distinguishing admin from participant actions) |
| Telemetry | `technician_location_pings`, rendered as a trail with a confidence band |
| Conversation | `chat_messages` |
| Evidence | `request_attachments`, pre- and post-work, with EXIF metadata overlay |
| Context | `request_context_tags` shown as inline chips ("Society Entry Delay: +15 min") |

The point of interleaving is that most disputes are resolved by seeing that the technician arrived at 14:05, the client's chat message at 14:02 said the gate was locked, and the entry-clearance timestamp was 14:18 — facts that are individually unremarkable and jointly decisive.

### 4.3 Dispute Arbitration Workbench

- Side-by-side statement of both parties' positions with their submitted evidence.
- Liability allocation control: client / technician / platform / split, with a split amount field.
- Settlement preview showing the resulting refund, credit, escrow release and payout adjustment **before** commit.
- Mandatory justification field; submission is blocked without it.

Resolution executes `resolve_dispute_arbitration()` — atomic across outcome, liability, financial adjustment and audit record. It deliberately does **not** suspend the technician; that is a separate, separately-audited decision, so "who resolved the dispute" and "who suspended the worker" remain independently answerable.

### 4.4 Override Console

| Control | Underlying mechanism | Audit type |
|---|---|---|
| Force status advancement | `force_advance_status()` RPC → writes event with `actor_role='admin'`, `reason='admin_override'` | `force_advance_status` |
| Reassign technician | Releases current assignment, re-dispatches as a successor request | `reassign_technician` |
| Trigger immediate payout | Releases escrow, marks payout disbursed | `force_payout` (maker-checker above threshold) |
| Issue refund or credit | Creates the adjustment against the invoice | `issue_refund` (maker-checker above threshold) |
| Apply/lift throttle | Inserts or expires `technician_dispatch_throttles` | `override_throttle` |

---

## 5. Pillar 2 — The Analyzer

### 5.1 Unit economics

| Metric | Derivation |
|---|---|
| Gross transaction value | Σ `invoices.total` over period |
| Net platform revenue | Σ `commission_deducted` less refunds |
| Average realised fare vs. estimate | Mean `final_price / estimated_total` |
| Payout ratio | Σ `net_amount` ÷ GTV |
| Surge contribution | Share of GTV attributable to `surge_multiplier_applied > 1` |

### 5.2 Cancellation and SLA composition

Cancellation is decomposed rather than reported as a single rate — the four terminal negatives have entirely different operational meanings:

| Outcome | Owner of the problem | Action implied |
|---|---|---|
| `cancelled` (client) | Demand-side | Trust/abuse review if concentrated on one client |
| `declined` (post-acceptance) | Supply-side | Capability review |
| `unfulfilled` | **Platform** — insufficient supply density | Recruitment or radius/pricing adjustment in that area |
| Ghosting-derived cancellation | Supply-side, severe | Lockout and deposit action |

SLA tracking: time-to-acceptance by radius tier, time-to-arrival vs. quoted ETA (context-adjusted per `RULES_AND_LOGIC.md` §9.8), and dispute-resolution latency.

### 5.3 Anomaly clusters

Aggregated views over the detector outputs: ghosting by technician and area, repeat-failure z-scores, photo-verification flags, collusion deviation scores, telemetry-degradation concentration (which usually indicates a coverage problem, not a behaviour problem).

### 5.4 Technician capability rollups

Per technician, per category: Bayesian rating and review count, completion and on-time rates, dispute rate, repeat-failure penalty, category experience, assignment share and current eligibility status with the specific blocking gate named.

---

## 6. Pillar 3 — The Controller

### 6.1 Onboarding verification pipeline

A staged queue: submitted → under review → verified / rejected, per verification type.

| Stage | Record | Note |
|---|---|---|
| Identity (Aadhaar eKYC) | `technician_verification_records` | Displays the **masked last four digits and verification token only**. The full identifier is never stored and therefore never displayed — this is a statutory constraint, not a UI preference |
| PAN | Same table | — |
| Police/background verification | Same table | Expiry tracked |
| Skill assessment | Same table | Feeds `skill_verified` |
| Vehicle | `technician_profiles` | Type and registration |

### 6.2 Tooling and equipment registry

Checklist per technician per registered category, resolved against `category_required_tools`. Shows attested tools with serial numbers and evidence photographs, pending attestations, and a colour-coded re-attestation countdown. An expired mandatory tool visibly blocks dispatch for that category — the console shows the consequence, not just the fact.

### 6.3 Insurance and liability tiers

Policy records with expiry countdown, or guarantee-deposit balance where the technician uses that pathway. A clear indicator of which liability tiers the technician is currently eligible for, and what would unlock the next one.

### 6.4 Risk and penalty engine

| Control | Effect |
|---|---|
| Temporary suspension | Open-ended `admin_manual` throttle |
| Shadow-ban | Throttle applied without a technician-facing notification, for fraud investigation without tipping off the subject |
| Daily quota override | Adjusts the fatigue cap for a specific technician and date |
| Ghosting lockout management | Review, extend or lift a `ghosting_lockout` throttle; manage associated deposit forfeiture |
| Client restriction | Applies pre-payment enforcement, booking limits, or dispatch lockout via `client_trust_profiles` band override |

---

## 7. Pillar 4 — Financial Guard

### 7.1 Fare variance monitor

Distribution of `final_price / estimated_total` across the platform, with drill-down by category, technician and reason code. The operational signals: a technician whose variance distribution is systematically right-shifted, and a reason code being used as a catch-all.

### 7.2 Commission, incentives and surge

- Commission rate management via versioned `commission_rules`; changes are forward-effective and never rewrite historical invoices.
- Surge multiplier controls scoped by category and H3 area with an active window; every manual surge is an audited action.
- Incentive campaigns modelled as negative penalty adjustments on payouts.

### 7.3 Settlement reconciliation — UPI and cash

UPI failure modes are separated because they carry different retry semantics and different fraud implications, which a single "failed" state would obscure:

| Outcome | Meaning | Retry | Fraud signal |
|---|---|---|---|
| Collect-request timeout | Client never acted on the request | Safe to re-issue | Low, unless repeated |
| PSP decline | Provider rejected | Re-issue, possibly alternate method | Low |
| Insufficient funds | Client-side balance | Re-issue later | Moderate if habitual |
| Card/net-banking failure | Gateway-reported | Standard retry | Low |
| **Cash attested** | Technician marked received | N/A | **Distinct handling** — self-attested, weighted accordingly in trust scoring; systematic cash preference by a specific pair is a collusion input |

Reconciliation view: invoices without a settling payment, payments without a matching invoice, cash attestations pending audit, and escrow-held amounts blocking payout.

### 7.4 Escrow and payout ledger

Per-technician payout queue: gross, commission, penalties, net, status, and where held, the specific dispute or claim holding it. Bulk disbursement is a maker-checker action.

---

## 8. Vector-to-Console Integration Matrix

Each detection vector from `RULES_AND_LOGIC.md` §9 and where it surfaces. This table is the single place UI presentation is specified.

| # | Vector | Alert trigger | Console component | Manual actions |
|---|---|---|---|---|
| 1 | Ghosting | Heartbeat timeout / hard timer, telemetry confidence cleared | "Ghosting Risk Alert" card in Escalation Inbox with GPS trail | One-click re-dispatch (creates successor request); force-cancel; apply lockout; manage deposit forfeiture |
| 2 | Photo mismatch | EXIF-GPS delta, timestamp anomaly, or pHash reuse | Side-by-side pre/post inspection card with metadata overlay and job-location pin | Approve as valid; escalate to dispute; request re-upload |
| 3 | Speed paradox | Repeat-visit z-score > threshold | "Repeat Failure Rate" badge on technician profile with linked repeat bookings | Manual tier demotion; dismiss as false positive |
| 4 | Tooling audit | Attestation expiry or missing mandatory tool | Tooling checklist per technician × category with expiry countdown | Approve attestation; force dispatch block; grant logged temporary exception |
| 5 | Disputes | New `disputes` row | Arbitration Workbench: dual-party timeline, evidence viewer, split-settlement control | Resolve with liability allocation; issue refund/credit; release or place escrow |
| 6 | Collusion | LLR / z-score breach | "Collusion Risk Graph" — accounts as nodes, anomaly score as edge weight, shared fingerprint/IP highlighted | Mark cleared/confirmed; restrict accounts; forward to fraud queue |
| 7 | Client abuse | Trust composite crosses band | Customer risk badge (Trusted / Review Needed / High Risk) in dispatch and dispute views | Enforce pre-payment; set booking limit; apply client lockout |
| 8 | Contextual latency | Context tag recorded | Timeline chips showing raw vs. adjusted duration ("Society Entry Delay: +15 min") | Approve or edit admin-adjusted delay where no integration exists |
| 9 | Telemetry confound | Trajectory density below floor | "Telemetry Degraded / Low Signal" indicator on the tracking trail, shown inline with any co-occurring ghosting alert | Override trip inclusion/exclusion from scoring (logged) |
| 10 | Fatigue | Approaching or crossing duty/heat-adjusted cap | Live Shift Monitor: duty hours, streak, heat multiplier, remaining capacity | Force shift end; override cap for one exceptional case (maker-checker) |
| 11 | Insurance/liability | Policy expiry approaching, or tier-3 dispatch attempted without coverage | Policy expiry tracker, claim submission form, escrow hold ledger | Verify renewal; approve deposit substitution; place/release escrow |

Every action in the rightmost column writes an `admin_actions` record per §9. That is not restated per row by design.

---

## 9. Audit Model

Every override, in every pillar, writes an immutable record:

| Field | Content |
|---|---|
| `admin_id` | Acting staff member (plus confirming staff member for maker-checker actions) |
| `action_type` | Enumerated action class |
| `target_entity_type` / `target_entity_id` | What was changed |
| `justification` | **Mandatory free text**; submission blocked if empty |
| `before_snapshot` / `after_snapshot` | Targeted column values, not full-row dumps |
| `created_at` | Partition key; retained indefinitely |

Additionally, `request_status_events.actor_role` distinguishes an administrator-driven transition from a participant-driven one permanently — so a job's history remains honest about who moved it, years later.

`support_moderator` can read only their own action history; `super_admin` reads all.

---

## 10. Alert Taxonomy

| Severity | Definition | Examples | Response expectation |
|---|---|---|---|
| **Critical** | Physical safety or active harm | Safety-category dispute, harassment report, distress signal | Immediate, unconditionally top of queue |
| **High** | Active job failing, or money at risk | Ghosting during an active emergency, large variance dispute, tier-3 dispatch without coverage | Same shift |
| **Medium** | Quality or integrity concern, job not blocked | Photo mismatch, repeat-failure flag, elevated collusion score | Within 24 hours |
| **Low** | Trend or hygiene | Unfulfilled clusters, expiring attestations, telemetry-degradation concentration | Batched review |

Detection confidence is displayed alongside severity: an operator must be able to tell a corroborated signal from a single weak indicator, particularly for fraud vectors where the false-positive cost falls on a worker's livelihood.

---

## 11. Non-Functional Requirements for the Console

| Requirement | Specification |
|---|---|
| Read routing | Dashboards and historical views read the **replica**; live escalation and distress views read **primary** |
| Query discipline | Every list view is paginated and index-backed; no unbounded scans on `requests` or `technician_location_pings` |
| Latency | Escalation Inbox first paint under 2 s at expected data volume |
| Auditability | No mutation path exists that bypasses `admin_actions` |
| Least privilege | `support_moderator` is the default staff role; `super_admin` is granted explicitly and sparingly |
| Data minimisation | Masked identifiers only for KYC; full contact details visible only where operationally necessary for the case in hand |
