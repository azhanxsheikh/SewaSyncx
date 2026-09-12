# Business Rules, Algorithms and Operational Vectors — SewaSync

**Document ID**: SWS-RULES-001
**Version**: 1.0
**Status**: Baseline for review
**Scope**: Technician constraints, pricing rules, reputation mathematics, dispatch scoring, fairness mechanics, and the eleven India-specific operational vectors.

> Data structures: `DATABASE.md`. Flow sequencing: `WORKFLOWS.md`. Administrative surfaces: `ADMIN_CONSOLE.md`. Every numeric default in this document is registered in §10 as an operator-tunable parameter.

---

## 1. Technician Constraints

### 1.1 Skill cap — maximum three categories

A technician registers between **one and three** service categories.

- **Why category, not offering**: matching operates at category level (an "Electrician", not an "AC Gas Refill specialist"). Service offerings are the priced scheduled-booking catalogue and are unrelated to capability registration.
- **Why a junction table**: the cap requires counting sibling rows, which a `CHECK` constraint cannot do, and a filtered array attribute violates 1NF once it must be joined and counted.
- **Why a locking trigger**: a plain `BEFORE INSERT` counting trigger races — two concurrent inserts can each observe two existing rows and both proceed, yielding four. The trigger first takes an exclusive lock on the parent `technician_profiles` row, serialising concurrent inserts for that technician only.
- **Supersedes**: the earlier `array_length BETWEEN 1 AND 4` formulation, in both the bound (4 → 3) and the mechanism (array → junction).

### 1.2 Concurrency — two guarantees, one mechanism

| Guarantee | Statement |
|---|---|
| **A — Real-time exclusivity** | At any instant, a technician is executing at most one emergency job |
| **B — Calendar non-overlap** | A technician may hold several accepted future bookings, provided no two execution windows intersect, and none intersects an active emergency |

Both are enforced by a single GiST exclusion constraint over `(technician_id, execution_window)` predicated on non-terminal status. The emergency window is `[accepted_at, ∞)`; the scheduled window is `[scheduled_at, scheduled_at + duration)`.

**Why the emergency window is unbounded**: bounding it by the duration *estimate* would release the calendar at the estimate's expiry, permitting a second booking into a slot the technician is still physically occupying. Emergencies overrun; the constraint must assume they will.

### 1.3 Eligibility gate catalogue

Every gate is evaluated before scoring. None can be overridden by any score, weight or exploration bonus.

| Gate | Source of truth | Failure exception |
|---|---|---|
| Category registered | `technician_categories` | `category_mismatch` |
| Online | `technician_profiles.is_online` | (filtered silently) |
| No calendar overlap | Exclusion constraint | `scheduling_conflict` |
| No active throttle | `technician_dispatch_throttles` | `ineligible_throttled` |
| Within search radius | `ST_DWithin` | (filtered silently) |
| Mandatory tooling attested | `technician_tooling` × `category_required_tools` | `ineligible_tooling` |
| Insurance for tier 2/3 | `technician_insurance_policies` or `technician_guarantee_deposits` | `ineligible_uninsured` |
| Exploration risk gate | Difficulty score + priority | (filtered silently) |

---

## 2. Client Rules

| Rule | Specification |
|---|---|
| Cancellation window | Self-service cancellation permitted from `pending`, `accepted`, `en_route` only |
| Post-arrival cancellation | Not self-service; treated as a dispute |
| Risk banding | `trusted` / `review_needed` / `high_risk`, computed from post-arrival cancellation rate, payment-dispute rate and harassment reports, with Bayesian shrinkage so a single incident cannot brand a long-standing client |
| High-risk consequences | Pre-payment enforced (bypassing pay-after-service), daily booking limit, and at the severe tier a dispatch lockout — the deliberate mirror of the technician ghosting lockout |
| Delegation | A client may act for family beneficiaries; beneficiaries never authenticate |

---

## 3. Pricing Rules

### 3.1 Emergency price composition

```text
estimated_total = ROUND(
    (sos_base_price + sos_emergency_fee) × surge_multiplier_applied × (1 + tax_rate)
)
```

The surge multiplier is resolved from `surge_pricing_rules` (most specific match: category + H3 cell, then category, then platform-wide) and **snapshotted onto the request** at creation, so a later surge change cannot retroactively alter a quoted price.

### 3.2 Scheduled price composition

```text
estimated_total = ROUND(offering.price × (1 + platform_fee_rate))
```

No emergency fee applies. The category-level "from ₹X" display value is `MIN(price)` across that category's offerings — computed, never stored as a duplicate.

### 3.3 Variance rules

| Condition | Requirement |
|---|---|
| `final_price ≤ estimated_total` | No approval. Charging less than quoted is never a dispute |
| `final_price > estimated_total` | Structured `price_adjustment_reason` required; an approved `request_cost_additions` row must exist before settlement |
| Reason = `other`, or variance > **10%** | Free-text `price_adjustment_notes` mandatory |
| Variance > **50%** | Flagged for administrative review; also feeds collusion scoring, since repeated large approved variances between one pair is itself a fraud signal |

### 3.4 Commission and payout

```text
commission_deducted = final_price × (commission_rate_applied / 100)
net_amount          = final_price − commission_deducted − penalty_deductions
```

`commission_rate_applied` is the rate effective at invoicing, snapshotted onto the invoice. Rates are versioned in `commission_rules` so historical invoices remain reproducible after a rate change.

---

## 4. Reputation Engine

### 4.1 Why not a plain average

A naive `AVG(rating)` makes a technician with one five-star review indistinguishable from one with two hundred, and lets a coordinated three-review pile-on destroy a newcomer while barely scratching an established worker. Both failure modes are corrected by shrinking each technician's raw average toward a population baseline in proportion to how little evidence exists for them.

### 4.2 Bayesian formulation

```text
        C · m  +  Σ rᵢ
R  =  ──────────────────
           C  +  n
```

| Symbol | Meaning | Source |
|---|---|---|
| `R` | Displayed rating | `technician_profiles.rating` |
| `n` | That technician's review count | `technician_profiles.review_count` |
| `Σ rᵢ` | Sum of that technician's raw ratings | Aggregated from `reviews` |
| `m` | Global (or per-category) mean rating | `platform_rating_baseline.global_mean` |
| `C` | Prior weight — how many "average" reviews of trust a newcomer starts with | `platform_rating_baseline.prior_weight`, default **10** |

**Choosing `C ≈ 10`**: it should approximate the review count at which a technician's own record becomes more informative than the population prior. For a services marketplace where an experienced profile stabilises over tens of jobs, 10 is a defensible starting point — and explicitly tunable once real distributions are observable.

**Behaviour at the extremes**: at `n = 1`, a single malicious one-star review moves `R` only slightly below `m`. At `n = 200`, the same review is nearly invisible. That asymmetry is the entire point.

### 4.3 Refresh mechanics

| Component | Cadence | Rationale |
|---|---|---|
| Per-technician `R`, `n` | On review insert (trigger), using the **cached** `m` and `C` | Keeps displayed ratings current without recomputing the global mean on every write |
| `m`, sample size | Nightly batch over all reviews | Prevents rating jitter across all profiles whenever any single review lands anywhere on the platform |
| Optional per-category baselines | Nightly | Refinement if trades prove to have systematically different rating tendencies |

### 4.4 Integrity constraints

- One review per completed job: `UNIQUE(reviews.request_id)` plus an insert policy requiring `requests.status = 'completed'` and caller = client.
- `rating` and `review_count` are column-level revoked from participants — reputation is never self-writable.

---

## 5. Worker Capability Scoring

Competence is **category-scoped**. A technician excellent at electrical work may be new to plumbing; a single global competence number would obscure exactly the distinction dispatch needs.

| Sub-term | Derivation | Why it needs no credential |
|---|---|---|
| Completion rate | completed ÷ (completed + technician-side cancellations and post-acceptance declines), per category | Behavioural, earned through outcomes |
| On-time rate | Actual arrival vs. quoted ETA, **context-adjusted** per §9.8 | Observable from telemetry, not self-reported |
| Bayesian review score | §4, scoped per category | Customer-verified, manipulation-damped |
| Dispute rate | Client-declined cost additions plus adverse dispute findings, per category | Penalises overreach and misdiagnosis directly |
| Category experience | Count of completed jobs in that category | Rewards demonstrated experience — the meritocratic substitute for a diploma |
| Repeat-failure penalty | §9.3 | Prevents "fast completion" from masking poor work |

Computed **offline nightly** and cached for scoring-time lookup. The dispatch path never runs these aggregations inline.

---

## 6. Task Difficulty Tiering

Staged deliberately, because the learned version requires data that does not yet exist.

| Stage | Method | Status |
|---|---|---|
| **Now** | Rule-based: category baseline difficulty + symptom-tag severity weights + questionnaire answer severity mapping (e.g. "smoke or sparks: yes" contributes a large increment, matching the safety warning the intake UI already surfaces) | Deterministic, auditable, zero training data |
| **Later** | Supervised model over the same structured features plus description embeddings, with labels derived from *realised* outcomes — actual vs. estimated duration, cost-addition frequency, dispute rate | Gated on §8.4 thresholds |
| **Later still** | Computer-vision severity from evidence media | Limited coverage by construction — evidence upload is skippable — so it must be an optional feature with a defined missing state, never a required input |

Difficulty governs two things: which liability tier applies, and whether unproven technicians may be explored on the job (§8.3).

---

## 7. Dispatch Scoring Function

For a candidate technician *t* and request *r* that has already passed every gate in §1.3:

```text
Score(t, r) =   w_eta   · f_eta(t, r)
              + w_comp  · f_comp(t, r)
              + w_skill · f_skill(t, r)
              + w_ret   · f_ret(t, r)
              − w_fair  · Penalty_fair(t)
```

| Term | Meaning |
|---|---|
| `f_eta` | Inverse estimated arrival time — the customer-facing urgency objective |
| `f_comp` | Category-scoped completion probability, from the §5 capability composite |
| `f_skill` | Category-match quality (core specialisation vs. peripheral recent addition) |
| `f_ret` | Retention proxy — prior positive history between this client and technician |
| `Penalty_fair` | Anti-monopoly adjustment, §8.1 |

All weights are operator-tunable (§10), expected to shift between growth-oriented and quality-oriented settings.

**Hard precedence**: a high-priority SOS request carries an ETA ceiling that no weighted term may breach. Fairness and exploration reorder candidates *within* the compliant set; safety and urgency win every conflict.

---

## 8. Fairness, Exploration and the ML Gate

### 8.1 Anti-starvation mechanics

The objective is to prevent the top decile of technicians absorbing the overwhelming majority of work. The Gini coefficient expresses that objective but **cannot be evaluated inside a per-request scoring function** — it is a population statistic, and a single request sees one candidate set.

Two-layer mechanism:

| Layer | Implementation |
|---|---|
| **In-loop** | A rolling per-technician assignment share (exponentially-weighted, trailing window) held in Redis at `fair:share:{technician_id}:{category_id}`, read at scoring time as a **bounded** penalty multiplier. Over-assigned technicians are discounted; under-assigned ones receive a small boost |
| **Out-of-loop** | Platform-wide Gini over assignment volume computed nightly, surfaced as a dashboard KPI and used as the slow feedback signal for retuning `w_fair`. It is a thermostat reading, not an optimisation target |

### 8.2 Exploration — Thompson Sampling

Each `(technician, category)` pair is a bandit arm. Reward is binary job success (completed without technician-side cancellation or adverse dispute). Posterior: **Beta(α = successes + 1, β = failures + 1)** — conjugate, cheap, and computable from counts already maintained in §5.

At selection, a sample is drawn from each eligible arm's posterior and blended into ranking, giving unproven technicians (wide posterior) a genuine probabilistic chance despite a trailing point estimate.

### 8.3 The risk gate that makes fair access real

Exploration is **bounded by task difficulty**, applied as a hard precondition before sampling — not as another soft weight:

- Unproven arms are eligible only for requests whose difficulty score falls **below** a configured threshold.
- Unproven arms are **never** eligible for `priority = 'high'` SOS, regardless of sampled value.

This is the mechanism that delivers the stated business goal: entry-level technicians build a verifiable record on genuinely low-risk work, and that record — not a credential — promotes them into harder, higher-value dispatch.

### 8.4 Preconditions before any model is trained

The deterministic engine of §7 is the production dispatcher. Learned components are gated on **all four** of the following holding simultaneously:

| # | Precondition | Default threshold |
|---|---|---|
| 1 | Sustained platform volume | ≥200–500 completed jobs/day for ≥60 consecutive days |
| 2 | Per-category sample size | ≥2,000–5,000 completed-and-reviewed jobs in *that* category (categories qualify independently) |
| 3 | Pipeline stability | Telemetry capture running with verified low drop and low missing-feature rates for ≥90 days |
| 4 | Label non-degeneracy | Outcome labels exhibit genuine class variance — if >98% of jobs are "completed, five stars", there is nothing to learn |

Until all four hold, investing in ML triage is a net-negative use of engineering time relative to hardening dispatch, trust and settlement — which is where the early-stage cost and risk actually sit.

---

## 9. Operational Vectors (Indian Context)

Uniform template per vector: **signal → detection → threshold → hook → action**. Administrative presentation is specified once in `ADMIN_CONSOLE.md` §8, not repeated here.

### 9.1 No-show and ghosting vs. honest cancellation

- **Signal**: distinguish an explicit early withdrawal from silent abandonment after acceptance.
- **Detection**: honest = an explicit `cancel_request` call. Ghosting = `accepted` with no position heartbeat for a sustained interval, near-zero displacement, or acceptance-to-`en_route` timer expiry with no action.
- **Threshold**: no heartbeat for **10 minutes** post-acceptance, or a **15-minute** hard timer with zero progress.
- **Hook**: `request_status_events.reason` records `technician_honest` vs. `technician_ghosted` vs. `system_timeout`. Terminal rows are never reopened; re-dispatch creates a successor request via `superseded_from_request_id`.
- **Action**: honest → neutral-to-minor acceptance-rate effect. Ghosting → immediate `ghosting_lockout` throttle plus escalating guarantee-deposit forfeiture. **Cross-check mandatory**: the telemetry-confidence branch (§9.9) must clear before a ghosting penalty applies.

### 9.2 Photo-verification and site integrity

- **Signal**: evidence must depict the actual site and actual work — not stock imagery, not a reused prior photo.
- **Detection**: EXIF GPS vs. `service_location`; capture timestamp vs. execution window; perceptual-hash comparison between pre- and post-work images; hash lookup against a platform-wide index to catch cross-job reuse.
- **Threshold**: EXIF-GPS delta > **150 m** (tolerant of indoor drift) or capture time outside window ± buffer → geotag flag. pHash Hamming distance **= 0** between pre and post → "no visible work" flag. Distance = 0 against an unrelated job's media → reuse flag.
- **Hook**: `request_attachments.exif_lat/lng`, `captured_at`, `phash`, `phase`.
- **Action**: routes to human review. **Never auto-penalises on a single signal** — indoor GPS drift and legitimately similar before/after states both occur naturally. Escalates only when combined with another flag on the same job.

### 9.3 Fault recurrence and quality inversion (the speed paradox)

- **Signal**: a technician completing unusually fast whose clients disproportionately re-request the same category shortly afterwards.
- **Detection**: `repeat_visit_rate` = (completed jobs followed by a new request, same client + same category, within N days) ÷ total completed, per technician per category; compared against that category's population baseline as a z-score.
- **Threshold**: warranty window **N = 10 days** (configurable 7–14); z-score > **2** flags elevated risk.
- **Hook**: multiplicatively down-weights the completion-rate sub-term in the §5 capability composite, capped so statistical noise cannot zero a score.
- **Action**: profile flag with links to affected repeat bookings; sustained elevation triggers automatic difficulty-tier demotion until the rate normalises.

### 9.4 Parts, tooling and equipment audits

- **Signal**: verified possession of category-critical tools (manifold gauges and vacuum pumps for AC work, thermal sensors, safety harnesses for height work).
- **Detection**: `category_required_tools` defines the mandatory set per category and liability tier; `technician_tooling` records attestation with serial number and photographic evidence.
- **Threshold**: re-attestation every **6–12 months**; lapse re-engages the gate automatically.
- **Hook**: hard eligibility gate (§1.3), evaluated before scoring.
- **Action**: dispatch-blocking until re-verified. No soft-penalty path — this is a safety gate, not a quality signal.

### 9.5 Dispute and grievance subsystem

- **Signal**: either party asserts a failure of the transaction.
- **Model**: `disputes` (initiator, role, reason category, description, lifecycle status, assigned moderator, liability amount and party) with `dispute_evidence` children.
- **Threshold**: one active dispute per request; resolution required before payout release where an escrow hold exists.
- **Hook**: outcomes feed the technician dispute-rate term (§5) and the client trust profile (§9.7) — one shared input, not two separately-tracked facts.
- **Action**: split settlement triggers partial refund/credit and payout adjustment; property-damage findings can trigger an escrow hold against pending payouts.

### 9.6 Collusion and review gaming

- **Signal**: a specific client-technician pair matching far more often than dispatch randomness would produce.
- **Detection**: model expected matches as a Poisson process with rate λ derived from the client's request volume × that technician's local category-matched selection probability. Compare observed count *k* against λ:

```text
LLR = 2 · [ k · ln(k / λ)  −  (k − λ) ]        (Poisson log-likelihood ratio)
```

- **Threshold**: flag when LLR exceeds the χ² critical value at p < 0.01 (1 d.f.), or equivalently z > **3**.
- **Corroborating signals** (raise confidence, never trigger alone): shared device fingerprint or IP between the two accounts; repeated large approved variances exclusive to the pair; review timestamps clustering within seconds.
- **Hook**: `technician_client_pair_stats` → `collusion_flags`.
- **Action**: **manual review only.** Fraud false positives are costly enough to require a human decision; no automatic account action.

### 9.7 Bi-directional safety and client abuse

- **Signal**: abusive customer behaviour, mirroring the technician trust problem.
- **Detection**: composite of post-arrival cancellation rate (weighted most heavily — the costliest case for a technician who has already travelled), payment-dispute rate, and technician-filed harassment reports.
- **Threshold**: three bands — `trusted`, `review_needed`, `high_risk` — with Bayesian shrinkage identical in shape to §4.
- **Hook**: `client_trust_profiles`, read at dispatch and checkout.
- **Action**: `high_risk` forces pre-payment, imposes a daily booking limit, and at the severe tier applies a client-side dispatch lockout — explicitly symmetric with §9.1's technician lockout.

### 9.8 Contextual latency decoupling

- **Signal**: raw duration penalises technicians for conditions outside their control — gated-society guard clearance, absent service lift with a high-floor carry, language mismatch.
- **Detection**: `request_context_tags` with a `source` distinguishing automatic capture from self-report. Where MyGate or NoBrokerHood integration exists, `society_entry_delay` is computed automatically as gate-clearance timestamp minus arrival-attempt timestamp.
- **Threshold**: where no integration covers a gated address, a fallback median of **8 minutes** applies (recalibrated from observed data) rather than penalising the technician for the platform's missing integration.
- **Hook**: `actual_duration_adjusted = actual_duration − Σ delay_minutes`. Only the adjusted value feeds on-time and speed terms.
- **Action**: vernacular mismatch **excludes** the job from duration scoring entirely rather than assigning a fabricated delay figure — inventing a number for an unquantifiable cause would be worse than acknowledging it cannot be measured.

### 9.9 Device and network telemetry confounds

- **Signal**: sparse or erratic GPS must not be read as poor performance when it is a device or network artefact — a real and constant condition on low-cost Android handsets with dual-SIM network switching and aggressive battery-saver background-task termination.
- **Detection**: `gps_trajectory_density` = observed ping count ÷ expected count for elapsed duration at the standard heartbeat interval. Individual implausible jumps (implied speed > **120 km/h** in dense urban context) are discarded as drift at point level rather than invalidating the whole trip.
- **Threshold**: confidence bands — High ≥ 0.8, Degraded 0.4–0.8, Low < 0.4. Mobility features admitted only at Degraded or better.
- **Hook**: gates whether §5's mobility-derived terms are computed at all for that trip.
- **Action**: Low-confidence trips are **excluded** from scoring, never included as noisy negative evidence. The confidence band is surfaced alongside any ghosting alert (§9.1) so a reviewer immediately sees whether "stationary" means stationary or means "no signal in a basement".

### 9.10 Workload saturation, fatigue and shift safety

- **Signal**: cumulative duty hours, continuous streaks and heat exposure affect both technician safety and work quality.
- **Detection**: `daily_active_minutes` from execution-window durations in a rolling 24-hour window; `continuous_duty_streak` since the last qualifying idle gap; an environmental multiplier lowers the threshold during flagged peak-heat windows (externally sourced ambient temperature by H3 cell — the weather integration flagged as missing infrastructure).
- **Threshold**: break-qualifying idle gap **30 minutes**; daily and streak caps operator-tunable, tightened automatically in extreme heat.
- **Hook**: hard eligibility gate via `technician_dispatch_throttles` (`throttle_type='fatigue'`); `technician_duty_ledger` provides the fast read.
- **Action**: soft-then-hard escalation — ETA inflation as the cap approaches (naturally deprioritising via `f_eta` before any block), then full dispatch exclusion on crossing, restored only after a mandatory rest interval.

### 9.11 Tiered insurance and high-stakes liability

- **Signal**: property-damage and physical-risk exposure differ sharply between a standard handyman task and high-voltage or complex-appliance work.
- **Model**: `service_categories.liability_tier` (1–3); `technician_insurance_policies` for formal coverage; `technician_guarantee_deposits` as a **self-funded alternative pathway**.
- **Threshold**: tier 3 (and optionally tier 2) requires active non-expired coverage **or** an adequate deposit on file.
- **Hook**: hard eligibility gate, evaluated before scoring alongside tooling and fatigue.
- **Action**: a property-damage dispute finding can trigger an escrow hold against pending payouts up to the claim amount.

**Design note on the deposit pathway**: gating tier-3 work solely behind formal insurance products would exclude precisely the independent technicians this platform exists to serve, reproducing the credential barrier the meritocracy principle rejects. The deposit path preserves the risk protection while keeping the tier reachable.

### 9.12 Additional variables flagged as currently unmodelled

Identified during edge-case analysis, not yet in the schema, listed so they are not rediscovered as surprises:

| Variable | Why it matters |
|---|---|
| Real-time traffic | ETA correction beyond straight-line distance; materially different in dense Indian urban conditions |
| Weather conditions | Drives both fatigue thresholds (§9.10) and demand spikes (water leakage during monsoon) |
| Parts availability | A completion delay cause unrelated to technician competence |
| Repeat-visit inversion | Covered in §9.3, but requires the follow-up-window feature to exist in the store |
| Technician insurance claim history | Distinct from coverage existence; a risk signal in its own right |
| Client chargeback history | Payment-side abuse distinct from cancellation behaviour |
| Building access complexity | Partially covered by §9.8 tags; a structured floor/lift/gated attribute on addresses would improve estimation |

---

## 10. Configuration Parameter Registry

Every threshold in this document is a tunable parameter, not a constant embedded in logic. Defaults below are starting points for calibration against real operating data.

| Parameter | Default | Governs | Section |
|---|---|---|---|
| `technician_max_categories` | 3 | Skill cap | §1.1 |
| `dispatch_radius_initial_km` | 10 | Initial search radius | `WORKFLOWS.md` §6.2 |
| `dispatch_radius_step_km` | 5 | Expansion increment | §6.2 |
| `dispatch_radius_max_km` | 30 | Terminal radius | §6.2 |
| `dispatch_tier_hold_seconds` | 120 | Hold per radius tier (emergency) | §6.2 |
| `scheduled_unfulfilled_cutoff_minutes` | 30 | Pre-slot cutoff for scheduled bookings | §6.2 |
| `sos_eta_ceiling_minutes` | Operator-set | Hard ceiling for high-priority dispatch | §7 |
| `w_eta`, `w_comp`, `w_skill`, `w_ret`, `w_fair` | Operator-set | Dispatch score weights | §7 |
| `bayesian_prior_weight_C` | 10 | Rating shrinkage strength | §4.2 |
| `rating_baseline_refresh` | Nightly | Global mean recomputation | §4.3 |
| `variance_notes_threshold_pct` | 10 | Mandatory free-text justification | §3.3 |
| `variance_review_threshold_pct` | 50 | Administrative review flag | §3.3 |
| `tax_rate`, `platform_fee_rate` | Operator-set | Price composition | §3.1–3.2 |
| `commission_rate_percent` | Operator-set, versioned | Payout deduction | §3.4 |
| `ghosting_heartbeat_timeout_minutes` | 10 | Ghosting detection | §9.1 |
| `ghosting_hard_timer_minutes` | 15 | System timeout | §9.1 |
| `exif_geotag_tolerance_meters` | 150 | Photo verification | §9.2 |
| `warranty_window_days` | 10 | Repeat-fault detection | §9.3 |
| `repeat_failure_zscore_threshold` | 2 | Quality-inversion flag | §9.3 |
| `tooling_reattestation_months` | 6–12 | Tool gate expiry | §9.4 |
| `collusion_llr_threshold` | χ² p<0.01 (z≈3) | Pair-anomaly flag | §9.6 |
| `society_entry_fallback_minutes` | 8 | Context delay default | §9.8 |
| `telemetry_confidence_floor` | 0.4 | Mobility feature admission | §9.9 |
| `implausible_speed_kmh` | 120 | GPS drift discard | §9.9 |
| `fatigue_break_gap_minutes` | 30 | Streak reset | §9.10 |
| `fatigue_daily_cap_minutes` | Operator-set | Hard dispatch cap | §9.10 |
| `ml_gate_daily_jobs`, `ml_gate_category_jobs`, `ml_gate_pipeline_days` | 200–500 / 2,000–5,000 / 90 | ML readiness | §8.4 |
