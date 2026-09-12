# Software Requirements Specification — SewaSync

**Document ID**: SWS-SRS-001
**Version**: 1.0
**Status**: Baseline for review
**Conformance**: Structured per ISO/IEC/IEEE 29148:2018 (superseding IEEE 830-1998)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for **SewaSync**, a cooperative gig-services platform for household and community services operating in the Indian market. It defines what the system shall do, the constraints under which it operates, and the quality attributes it must satisfy.

The intended audience is: the engineering team implementing the platform, the reviewers approving the database and security design, and any future maintainer who needs to understand *why* a given rule exists rather than only *what* the code does.

This SRS is the requirements baseline. The design that satisfies these requirements is specified across five companion documents:

| Document | Covers |
|---|---|
| `ARCHITECTURE.md` | System architecture, deployment topology, technology stack, infrastructure |
| `DATABASE.md` | Data dictionary, spatial design, indexing, RPC contracts, RLS/RBAC |
| `WORKFLOWS.md` | State machines, dispatch algorithms, mediation and settlement flows |
| `RULES_AND_LOGIC.md` | Business constraints, scoring algorithms, India-specific operational vectors |
| `ADMIN_CONSOLE.md` | Administrative operations, mediation and fraud-monitoring surfaces |

### 1.2 Scope

**Product name**: SewaSync.

**In scope**: an emergency (SOS) and scheduled home-services marketplace connecting residents with verified cooperative technicians. The system provides service request intake, geospatial dispatch with automatic search-radius expansion, real-time technician tracking, in-app messaging, transparent pricing with an approval-gated variance mechanism, digital invoicing and payment reconciliation (UPI/card/net-banking/cash), a reputation system, a delegated "family SOS" capability, and a full administrative operations console covering verification, mediation, fraud detection and financial control.

**Out of scope for the current baseline** (explicitly deferred, with rationale recorded in §6):

- Machine-learning-driven dispatch triage (difficulty classification, capability prediction, multi-armed-bandit exploration).
- Migration of the client-facing applications from the current Vite SPA to Next.js.
- An authenticated surface for family-member beneficiaries.
- Self-hosted routing infrastructure (OSRM/GraphHopper).

**Business objective**: reduce the time between a household emergency and a verified professional arriving at the door, while guaranteeing price transparency, technician safety, and equitable distribution of work across the technician cooperative.

### 1.3 Definitions, Acronyms and Abbreviations

| Term | Definition |
|---|---|
| **SOS / Emergency request** | A service request requiring immediate dispatch. Characterised in data by `scheduled_at IS NULL`. |
| **Scheduled booking** | A service request for a future time slot. Characterised by `scheduled_at IS NOT NULL`. |
| **Client** | An authenticated resident who creates service requests and is billed for them. |
| **Technician** | An authenticated service professional who accepts and executes requests. |
| **Beneficiary / Family member** | A person on whose behalf a client raises a request. Has no platform account. |
| **Dispatch** | The process of matching a pending request to an eligible technician. |
| **Execution window** | The time interval a technician is committed to a given request; the basis of concurrency control. |
| **Eligibility gate** | A hard precondition a technician must satisfy before being considered for a request. |
| **Variance** | The difference between the quoted estimate and the final charged price. |
| **RLS** | Row-Level Security (PostgreSQL). |
| **RPC** | Remote Procedure Call; here, a PostgreSQL `SECURITY DEFINER` function invoked from the client. |
| **KUA / AUA** | KYC User Agency / Authentication User Agency — UIDAI-licensed intermediaries for Aadhaar verification. |
| **H3 cell** | A hexagonal spatial index cell, used for privacy-preserving location generalisation. |
| **MyGate / NoBrokerHood** | Indian gated-community visitor-management platforms, used as a source of entry-clearance timestamps. |

### 1.4 References

1. ISO/IEC/IEEE 29148:2018 — Systems and software engineering, Requirements engineering.
2. The Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016, and associated UIDAI regulations governing the collection and storage of Aadhaar identifiers by requesting entities.
3. OGC Simple Feature Access / EPSG:4326 (WGS 84) — spatial reference system used throughout.
4. PostgreSQL 15+ documentation: Row Security Policies, Exclusion Constraints, Declarative Partitioning.
5. SewaSync Problem Statement SIH26089 — *Co-operative Gig Services Platform for Household & Community Services*.

### 1.5 Document Conventions

- Requirements use **SHALL** for mandatory behaviour, **SHOULD** for recommended behaviour, and **MAY** for optional behaviour.
- Each requirement carries a stable identifier of the form `FR-<MODULE>-<NNN>` (functional) or `NFR-<CATEGORY>-<NNN>` (non-functional). Identifiers are never reused after retirement.
- Requirements marked **[DEFERRED]** are specified for completeness but are explicitly outside the current implementation baseline.

---

## 2. Overall Description

### 2.1 Product Perspective

SewaSync is a greenfield replacement for a prototype. The current codebase is a single Vite + React single-page application in which all state is held client-side: mock data files supply the service catalogue, technician roster and booking history, and cross-surface state synchronisation between the client and technician views is simulated using `BroadcastChannel`, `localStorage` mirroring, and an HTTP poll against a development-only bridge endpoint. There is no backend, no persistence, and no authentication.

The target system replaces this simulation with a Supabase-backed platform: PostgreSQL with PostGIS as the authoritative data store, GoTrue for authentication, Supabase Realtime for live state propagation, and Supabase Storage for media. The user-facing screen inventory is largely preserved; what changes is that every piece of state becomes server-authoritative and every mutation becomes access-controlled.

The platform comprises three distinct front-end surfaces sharing one backend:

1. **Client application** — request intake, tracking, payment, reviews, family management.
2. **Technician console** — dispatch feed, job execution, navigation, earnings.
3. **Administrative console** — verification, mediation, analytics, financial control.

### 2.2 Product Functions

At the highest level, the system shall:

- Authenticate users and distinguish clients, technicians and internal staff.
- Maintain a catalogue of service categories and priced service offerings.
- Accept emergency and scheduled service requests, including requests raised on behalf of family beneficiaries.
- Match requests to eligible technicians using geospatial proximity, verified capability, availability and equity considerations.
- Expand the dispatch search radius progressively when no technician accepts, and terminate unmatched requests in a well-defined state.
- Guarantee that a technician can never hold two temporally overlapping commitments.
- Track technician location in real time and present live ETA to the client.
- Support in-app messaging and out-of-band contact via native telephony and WhatsApp deep links.
- Enforce an approval gate on any price increase above the original estimate.
- Generate invoices, reconcile payments across UPI, card, net-banking and cash, and compute technician payouts net of commission and penalties.
- Collect reviews and maintain a statistically sound reputation score resistant to cold-start distortion and review bombing.
- Detect and surface operational anomalies: ghosting, photo-verification mismatch, quality inversion, collusion, client abuse, telemetry degradation and technician fatigue.
- Provide staff with mediation, arbitration, verification and financial-control tooling, with every override audited.

### 2.3 User Classes and Characteristics

| User class | Characteristics | Technical proficiency | Access |
|---|---|---|---|
| **Client (resident)** | Books household services; may act on behalf of family members; price-sensitive; often under stress during emergencies | Low to moderate; mobile-first | Own data only |
| **Technician** | Service professional; may have no formal credentials; earns per job; mobile-only; frequently operating a low-cost Android device on an intermittent cellular connection | Low; vernacular-language needs common | Own data plus dispatch-eligible pending requests |
| **Family beneficiary** | The person receiving service when a client books for someone else (e.g. an elderly parent at a different address) | Not a system user | None — no account |
| **Support moderator** | Internal staff handling escalations, disputes and verification review | High | Read-across-platform; constrained write |
| **Super administrator** | Internal staff with full override authority | High | Unrestricted, fully audited |

### 2.4 Operating Environment

- **Client surfaces**: modern mobile and desktop browsers; the technician console is used predominantly on mid- and low-tier Android devices.
- **Backend**: PostgreSQL 15+ with PostGIS, `btree_gist`, `pgcrypto` and `pg_cron`; Supabase platform services (Auth, Realtime, Storage, Edge Functions).
- **Supporting services**: Redis (Sentinel topology) for ephemeral caching and queues; an S3-compatible object store for the analytics cold tier.
- **Network conditions**: the system shall assume intermittent connectivity, dual-SIM network switching, and aggressive OS-level background-task termination on technician devices.

### 2.5 Design and Implementation Constraints

| ID | Constraint |
|---|---|
| C-01 | Authorisation shall be enforced at the database layer using RLS. Application-layer checks are defence-in-depth, never the primary control. |
| C-02 | Business-critical state transitions shall occur only through `SECURITY DEFINER` RPCs. Direct client `UPDATE` on status, assignment or pricing columns is prohibited. |
| C-03 | Spatial data shall be stored as `GEOGRAPHY(Point, 4326)`. Storing latitude and longitude as independent columns alongside a geography column is prohibited as a normalisation defect. |
| C-04 | Aadhaar numbers shall never be persisted. Identity verification shall occur through a licensed KUA/AUA intermediary, with only a verification reference token, masked last-four digits, status and authority reference retained. |
| C-05 | Telephone numbers shall be stored exclusively in canonical E.164 form. Display formatting is a presentation concern. |
| C-06 | No synchronous network I/O shall occur inside a database transaction on the request-serving path. |
| C-07 | Free-text user content shall not be promoted to the analytics cold tier until an audited PII-redaction pipeline exists. |
| C-08 | Terminal request records are immutable with respect to lifecycle. Re-dispatch creates a new record referencing the original; it does not reopen a closed one. |
| C-09 | Every administrative override shall write an immutable audit record including a mandatory justification. |

### 2.6 Assumptions and Dependencies

- Technicians grant and maintain location permission while on duty; the system degrades gracefully but cannot dispatch accurately without it.
- OpenStreetMap Nominatim and the public OSRM demo service are acceptable for prototype use only; production requires a proxied, cached, rate-limited geocoding path (see `ARCHITECTURE.md`).
- Gated-community entry timestamps depend on third-party integrations (MyGate, NoBrokerHood) whose availability varies by society; the system shall degrade to a configured fallback where absent.
- Payment settlement depends on an external PSP for digital methods; cash settlement depends on technician self-attestation, which carries different fraud characteristics.
- UIDAI-licensed KYC intermediary availability is assumed for technician onboarding.

---

## 3. Specific Requirements

### 3.1 External Interface Requirements

#### 3.1.1 User Interfaces

- **UI-01** The client application shall present the emergency request flow as a bounded, resumable sequence: service selection, priority triage, location confirmation, evidence capture, diagnostic questionnaire, price review, confirmation.
- **UI-02** All client-facing surfaces shall be usable at a viewport width of 360 px.
- **UI-03** The technician console shall surface, before acceptance, sufficient information to make an informed accept/decline decision: category, priority, doorstep address, evidence media, reported symptoms and estimated value.
- **UI-04** Monetary values shall be displayed in Indian Rupees with locale-appropriate digit grouping.
- **UI-05** The system should support vernacular language presentation; language preference shall be a first-class user attribute rather than a device-derived inference.

#### 3.1.2 Hardware Interfaces

- **HI-01** The system shall consume the W3C Geolocation API for both client address confirmation and technician position broadcast.
- **HI-02** The system shall consume device camera and media-library inputs for evidence capture, accepting images and video.

#### 3.1.3 Software Interfaces

| Interface | Purpose | Direction |
|---|---|---|
| Supabase Auth (GoTrue) | Identity, session issuance | Bidirectional |
| Supabase PostgREST | Table and RPC access under RLS | Bidirectional |
| Supabase Realtime | Live propagation of request, location, chat and cost-addition changes | Inbound to clients |
| Supabase Storage | Evidence media, technician photographs, tooling attestations | Bidirectional |
| OpenStreetMap / Nominatim | Forward and reverse geocoding | Outbound |
| Google Maps | Turn-by-turn navigation handoff via deep link | Outbound |
| WhatsApp (`wa.me`) | Out-of-band contextual messaging | Outbound |
| Native telephony (`tel:`) | Direct voice contact | Outbound |
| Payment service provider | Digital settlement and callbacks | Bidirectional |
| KYC intermediary (KUA/AUA) | Technician identity verification | Outbound |
| Weather data service | Ambient conditions for fatigue thresholds and demand analytics | Outbound |
| MyGate / NoBrokerHood | Gated-society entry-clearance timestamps | Inbound |

#### 3.1.4 Communications Interfaces

- **CI-01** All external communication shall occur over TLS.
- **CI-02** Realtime transport shall be WebSocket-based, with row delivery gated by the same RLS predicates that govern direct reads.
- **CI-03** WhatsApp deep links shall be constructed as `https://wa.me/<E.164 digits>?text=<URL-encoded context>`; navigation deep links as `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`.

### 3.2 Functional Requirements

#### 3.2.1 Identity and Access (FR-AUTH)

| ID | Requirement |
|---|---|
| FR-AUTH-001 | The system shall authenticate users via email/password or phone-based credentials issued by Supabase Auth. |
| FR-AUTH-002 | The system shall create a corresponding profile record automatically upon account creation. |
| FR-AUTH-003 | The system shall classify every account as exactly one of: client, technician. Internal staff shall be represented in a separate staff registry, not as a third account role. |
| FR-AUTH-004 | The system shall restrict every user's read and write access to their own records except where a specific policy grants broader visibility. |
| FR-AUTH-005 | The system shall grant unauthenticated visitors read access only to the public service catalogue. |

#### 3.2.2 Service Catalogue (FR-CAT)

| ID | Requirement |
|---|---|
| FR-CAT-001 | The system shall maintain service categories, each identified by a stable slug, and each declaring whether it supports emergency dispatch, scheduled booking, or both. |
| FR-CAT-002 | The system shall maintain emergency pricing (base price and emergency dispatch fee) per category. |
| FR-CAT-003 | The system shall maintain named, individually priced service offerings under each category for scheduled booking, each carrying a duration estimate range. |
| FR-CAT-004 | The system shall assign each category a liability tier (1–3) governing insurance prerequisites for dispatch. |
| FR-CAT-005 | The system shall not duplicate a category's identity across emergency and scheduled catalogues; a single category record shall carry both pricing modes. |

#### 3.2.3 Client Profile and Addressing (FR-CLIENT)

| ID | Requirement |
|---|---|
| FR-CLIENT-001 | A client shall be able to maintain multiple saved addresses, each with a label, and designate at most one as default. |
| FR-CLIENT-002 | A client shall be able to maintain family-member records, each with a name, relationship, contact number and address. |
| FR-CLIENT-003 | The system shall treat a family member as a beneficiary, never as an authenticable identity. |
| FR-CLIENT-004 | A request shall reference either a saved address or a family member, never both. |

#### 3.2.4 Emergency Request Intake (FR-SOS)

| ID | Requirement |
|---|---|
| FR-SOS-001 | A client shall be able to raise an emergency request selecting a service category and a priority level of low, medium or high. |
| FR-SOS-002 | The system shall require a priority value for every emergency request. |
| FR-SOS-003 | The system shall capture the service location as a geographic point, sourced from live GPS, a saved address, or a manually positioned map pin. |
| FR-SOS-004 | The system shall permit, but not require, the attachment of photographic or video evidence, and shall permit free-text problem description and multi-select symptom tags. |
| FR-SOS-005 | The system shall present a complete price estimate — base price, emergency fee, applicable taxes and any surge multiplier — before the client confirms. |
| FR-SOS-006 | The system shall snapshot the contact name, contact telephone number and full address onto the request at creation, such that subsequent edits to the source records do not alter the historical record. |
| FR-SOS-007 | The system shall record the diagnostic questionnaire responses associated with a request. |
| FR-SOS-008 | A client shall be able to raise an emergency request on behalf of a family member, dispatching to that member's address and contact details. |

#### 3.2.5 Scheduled Booking (FR-SCHED)

| ID | Requirement |
|---|---|
| FR-SCHED-001 | A client shall be able to book a named service offering for a future date and time slot. |
| FR-SCHED-002 | The system shall snapshot the offering's price and duration estimate onto the request at creation. |
| FR-SCHED-003 | The system shall permit a technician to hold multiple accepted scheduled bookings concurrently, provided no two execution windows overlap. |
| FR-SCHED-004 | The system shall transition a scheduled booking that remains unaccepted within a configured cutoff before its start time to an unfulfilled state. |

#### 3.2.6 Dispatch and Matching (FR-DISPATCH)

| ID | Requirement |
|---|---|
| FR-DISPATCH-001 | The system shall make a pending request visible only to technicians who are online, hold the request's category among their registered capabilities, and are located within the request's current search radius. |
| FR-DISPATCH-002 | The system shall initialise the search radius for an emergency request at 10 km. |
| FR-DISPATCH-003 | The system shall expand an unaccepted emergency request's search radius in 5 km increments — 10, 15, 20, 25, 30 km — after each configured hold interval elapses without acceptance. |
| FR-DISPATCH-004 | The system shall transition an emergency request that remains unaccepted after the hold interval at 30 km to an unfulfilled state, and shall communicate this to the client as a request to try again later. |
| FR-DISPATCH-005 | Radius expansion and unfulfilment shall be driven by a server-side scheduled process. The system shall not depend on a client-side timer for lifecycle progression. |
| FR-DISPATCH-006 | The system shall rank eligible technicians by a weighted score combining estimated arrival time, completion probability, capability match, client-technician affinity and an equity adjustment. |
| FR-DISPATCH-007 | The system shall evaluate hard eligibility gates before scoring, and shall never permit a scoring adjustment to override a gate. |
| FR-DISPATCH-008 | The system shall permit a technician to dismiss a pending request from their own feed without altering that request's availability to other technicians. |
| FR-DISPATCH-009 | [DEFERRED] The system may apply learned difficulty classification and capability prediction to dispatch ranking once the data-volume preconditions in `RULES_AND_LOGIC.md` are satisfied. |

#### 3.2.7 Technician Capability and Concurrency (FR-TECH)

| ID | Requirement |
|---|---|
| FR-TECH-001 | A technician shall register between one and three service categories. The system shall reject a fourth. |
| FR-TECH-002 | The system shall enforce the category cap under concurrent modification without permitting a race to exceed it. |
| FR-TECH-003 | The system shall guarantee that a technician holds at most one active emergency commitment at any instant. |
| FR-TECH-004 | The system shall prevent a technician from accepting any request whose execution window overlaps an existing non-terminal commitment. |
| FR-TECH-005 | The system shall treat an emergency job's execution window as open-ended until the job reaches a terminal state, such that an overrunning job cannot release the technician's calendar. |
| FR-TECH-006 | The system shall enforce concurrency at the database engine level, not solely in application logic. |
| FR-TECH-007 | The system shall record the technician's geographic position at the moment of assignment, distinct from subsequent live tracking. |

#### 3.2.8 Request Lifecycle (FR-LIFE)

| ID | Requirement |
|---|---|
| FR-LIFE-001 | The system shall model request state as exactly one of: pending, accepted, en_route, arrived, in_progress, completed, cancelled, declined, unfulfilled. |
| FR-LIFE-002 | The system shall permit only the transitions enumerated in `WORKFLOWS.md` and shall reject any other transition with a diagnostic error rather than silently coercing state. |
| FR-LIFE-003 | The system shall append an immutable audit event for every state transition, recording the acting party, the party's role, and where applicable the reason. |
| FR-LIFE-004 | The system shall distinguish, in the audit record, a transition performed by an administrator from one performed by a participant. |
| FR-LIFE-005 | The system shall permit client-initiated cancellation only from pending, accepted and en_route states. |
| FR-LIFE-006 | The system shall treat completed, cancelled, declined and unfulfilled as terminal; no transition shall originate from them. |

#### 3.2.9 Tracking and Communication (FR-TRACK, FR-CHAT)

| ID | Requirement |
|---|---|
| FR-TRACK-001 | The system shall broadcast the assigned technician's position to the requesting client in real time while the job is active. |
| FR-TRACK-002 | The system shall maintain the current position of each technician as a single authoritative record optimised for proximity search. |
| FR-TRACK-003 | The system shall retain a complete historical trajectory of position reports, separately from the current-position record, for telemetry and evidentiary purposes. |
| FR-TRACK-004 | The system shall compute and display an estimated time of arrival derived from distance and a configurable urban travel-speed assumption. |
| FR-TRACK-005 | The system shall annotate position reports with device accuracy and network-type metadata to permit downstream quality assessment. |
| FR-CHAT-001 | The system shall provide in-app messaging between the client and the assigned technician, scoped to a single request. |
| FR-CHAT-002 | The system shall deliver messages in real time to both participants and to no one else. |
| FR-CHAT-003 | The system shall provide deep links for native voice calling and WhatsApp messaging pre-filled with job context. |

#### 3.2.10 Pricing, Variance and Settlement (FR-PAY)

| ID | Requirement |
|---|---|
| FR-PAY-001 | The system shall present a transparent, itemised estimate before the client commits to a request. |
| FR-PAY-002 | The system shall snapshot any applicable surge multiplier onto the request at creation. |
| FR-PAY-003 | A technician shall be able to submit a final price at settlement, defaulted to the original estimate. |
| FR-PAY-004 | Where the final price exceeds the estimate, the system shall require a structured adjustment reason and shall require explicit client approval before the job may be completed. |
| FR-PAY-005 | Where the final price is less than or equal to the estimate, the system shall not require client approval. |
| FR-PAY-006 | The system shall require free-text justification where the adjustment reason is "other" or where the variance exceeds a configured percentage threshold. |
| FR-PAY-007 | The system shall flag for administrative review any variance exceeding a second, higher configured threshold. |
| FR-PAY-008 | The system shall refuse settlement while any associated cost addition remains unapproved, raising an error rather than writing a partial result. |
| FR-PAY-009 | The system shall generate an invoice with itemised line items upon job completion. |
| FR-PAY-010 | The system shall apply the commission rate in effect at the time of invoicing, and shall preserve historical rates such that past invoices remain reproducible. |
| FR-PAY-011 | The system shall support settlement by UPI, card, net banking and cash, and shall model cash settlement as technician-attested rather than client-initiated. |
| FR-PAY-012 | The system shall compute technician payouts as gross value less commission less any penalty deductions. |
| FR-PAY-013 | The system shall support placing and releasing escrow holds against a request or dispute. |

#### 3.2.11 Reviews and Reputation (FR-REV)

| ID | Requirement |
|---|---|
| FR-REV-001 | A client shall be able to submit exactly one review per completed request, comprising a 1–5 star rating, optional attribute tags, optional free text and an optional gratuity. |
| FR-REV-002 | The system shall reject a review for any request not in the completed state. |
| FR-REV-003 | The system shall compute a technician's displayed rating using a Bayesian-shrunk average rather than a naive arithmetic mean, to resist cold-start distortion and coordinated review manipulation. |
| FR-REV-004 | The system shall maintain the global rating baseline used by that computation on a scheduled batch cadence, not per review. |
| FR-REV-005 | The system shall treat rating and review count as system-maintained; they shall not be writable by any participant. |

#### 3.2.12 Verification and Compliance (FR-VERIFY)

| ID | Requirement |
|---|---|
| FR-VERIFY-001 | The system shall record identity, background and skill verification outcomes for each technician. |
| FR-VERIFY-002 | The system shall persist only a verification reference token, masked identifier fragment, status, verifying authority and timestamps for Aadhaar-based verification. It shall not persist the Aadhaar number. |
| FR-VERIFY-003 | The system shall record verified ownership of category-mandatory tools, including serial number and photographic attestation where applicable. |
| FR-VERIFY-004 | The system shall expire tool attestations after a configured interval and shall re-engage the corresponding dispatch gate until re-attested. |
| FR-VERIFY-005 | The system shall record insurance policies and, as an alternative pathway, guarantee-fund deposits. |
| FR-VERIFY-006 | The system shall prevent dispatch of tier-2 and tier-3 liability categories to a technician lacking active coverage or an adequate deposit. |
| FR-VERIFY-007 | The system shall not require formal educational credentials as a precondition for any dispatch eligibility. |

#### 3.2.13 Safety, Fatigue and Throttling (FR-SAFETY)

| ID | Requirement |
|---|---|
| FR-SAFETY-001 | The system shall track cumulative daily active duty minutes and continuous duty streaks per technician. |
| FR-SAFETY-002 | The system shall lower the effective fatigue threshold during flagged extreme-heat conditions. |
| FR-SAFETY-003 | The system shall inflate presented ETA as a technician approaches a fatigue threshold, and shall remove the technician from dispatch eligibility upon crossing it. |
| FR-SAFETY-004 | The system shall require a configured rest interval before restoring eligibility. |
| FR-SAFETY-005 | The system shall provide a unified mechanism for recording dispatch ineligibility, covering fatigue, administrative suspension, risk-based throttling and ghosting lockout. |
| FR-SAFETY-006 | The system shall never permit an equity, exploration or fairness adjustment to delay dispatch of a high-priority emergency beyond a configured arrival-time ceiling. |

#### 3.2.14 Trust, Abuse and Fraud (FR-TRUST)

| ID | Requirement |
|---|---|
| FR-TRUST-001 | The system shall distinguish honest early cancellation from silent abandonment, using explicit action, position stasis and heartbeat absence as discriminating signals. |
| FR-TRUST-002 | The system shall apply materially different consequences to the two, ranging from a minor acceptance-rate effect to immediate dispatch lockout and deposit forfeiture. |
| FR-TRUST-003 | The system shall pair pre-work and post-work evidence media and shall assess geotag proximity, capture-time consistency and perceptual-hash similarity. |
| FR-TRUST-004 | The system shall route evidence anomalies to human review and shall not apply an automatic penalty on a single such signal. |
| FR-TRUST-005 | The system shall measure repeat service requests for the same category by the same client within a configured warranty window and shall down-weight the responsible technician's completion-rate contribution accordingly. |
| FR-TRUST-006 | The system shall compute, for each client-technician pair, the deviation between observed match frequency and the frequency expected under the dispatch distribution, and shall flag statistically improbable affinity. |
| FR-TRUST-007 | The system shall maintain a client-side trust profile mirroring the technician capability model, incorporating post-arrival cancellation, payment disputes and harassment reports. |
| FR-TRUST-008 | The system shall support graduated client restrictions: pre-payment enforcement, booking rate limits and dispatch lockout. |
| FR-TRUST-009 | The system shall compute a telemetry confidence measure per trip and shall exclude low-confidence trajectories from performance scoring rather than penalising the technician for them. |
| FR-TRUST-010 | The system shall record contextual delay attributions — gated-society entry clearance, absent service lift, language mismatch — and shall normalise duration-based performance metrics against them. |

#### 3.2.15 Mediation and Disputes (FR-DISP)

| ID | Requirement |
|---|---|
| FR-DISP-001 | Either participant shall be able to file a dispute against a request, selecting a structured reason category and providing a description. |
| FR-DISP-002 | The system shall permit at most one active dispute per request while retaining a history of prior resolved disputes. |
| FR-DISP-003 | The system shall support attachment of evidence to a dispute, including photographs, video, chat excerpts and references to lifecycle events. |
| FR-DISP-004 | The system shall progress disputes through a defined lifecycle culminating in a resolution that allocates monetary liability to the client, the technician, the platform, or a split thereof. |
| FR-DISP-005 | Dispute resolution shall atomically apply any consequent financial adjustment and shall write an audit record with mandatory justification. |
| FR-DISP-006 | Filing a dispute shall not, by itself, alter the request's lifecycle state. |
| FR-DISP-007 | Dispute outcomes shall feed both technician capability scoring and client trust scoring. |

#### 3.2.16 Administration (FR-ADMIN)

| ID | Requirement |
|---|---|
| FR-ADMIN-001 | The system shall provide staff with an escalation inbox covering active jobs, price disagreements, complaints and distress signals. |
| FR-ADMIN-002 | The system shall provide a dual-party timeline interleaving telemetry, lifecycle events, chat excerpts and media. |
| FR-ADMIN-003 | The system shall provide override controls: forced status advancement, forced payout, technician reassignment, refunds and credits. |
| FR-ADMIN-004 | The system shall require a justification for every override and shall persist an immutable record of it. |
| FR-ADMIN-005 | The system shall require secondary approval for overrides exceeding configured monetary or severity thresholds. |
| FR-ADMIN-006 | The system shall provide dashboards for unit economics, cancellation composition, SLA compliance and anomaly clustering. |
| FR-ADMIN-007 | The system shall provide surge multiplier and commission rate controls. |
| FR-ADMIN-008 | The system shall distinguish support-moderator authority from super-administrator authority. |
| FR-ADMIN-009 | Administrative read access shall span all records; this is an explicit, documented departure from participant-scoped visibility. |

#### 3.2.17 Telemetry and Analytics (FR-TELEM)

| ID | Requirement |
|---|---|
| FR-TELEM-001 | The system shall capture lifecycle and outcome events for analytics without introducing latency to the transactional path. |
| FR-TELEM-002 | Event capture shall be transactionally consistent with the business write it accompanies. |
| FR-TELEM-003 | The system shall not perform network I/O within the capturing transaction. |
| FR-TELEM-004 | The system shall generalise location data to a coarse spatial cell before archival, rather than hashing coordinates. |
| FR-TELEM-005 | The system shall pseudonymise identity fields by salted hash where linkage without content is required. |
| FR-TELEM-006 | The system shall partition archived data such that an erasure request affects a bounded, known set of files. |
| FR-TELEM-007 | High-growth telemetry tables shall be partitioned by time and shall be subject to a defined retention schedule. |

### 3.3 Non-Functional Requirements

#### 3.3.1 Performance (NFR-PERF)

| ID | Requirement |
|---|---|
| NFR-PERF-001 | Dispatch candidate resolution shall complete within 200 ms at the database layer under expected load. |
| NFR-PERF-002 | Proximity search shall use a spatial index; sequential scanning of technician positions is prohibited. |
| NFR-PERF-003 | Queries on the dispatch path shall project only required columns. |
| NFR-PERF-004 | Analytical and historical reads shall be routed to a read replica; dispatch and live tracking shall always read the primary. |
| NFR-PERF-005 | Aggregate scores consumed at dispatch time shall be precomputed and cached, not computed inline. |

#### 3.3.2 Security (NFR-SEC)

| ID | Requirement |
|---|---|
| NFR-SEC-001 | RLS shall be enabled on every table in the public schema. |
| NFR-SEC-002 | Column-level privileges shall restrict writes to system-maintained fields even where row-level access is granted. |
| NFR-SEC-003 | Media access shall be governed by storage policies consistent with the corresponding table policies. |
| NFR-SEC-004 | Realtime subscriptions shall not constitute a data-access bypass; delivery shall be gated by the same predicates as direct reads. |
| NFR-SEC-005 | Technician visibility of unassigned pending requests, including contact details, is an accepted and documented exposure, bounded by category match and current search radius. |
| NFR-SEC-006 | Administrative capability shall be verified against a staff registry, never inferred from a client-modifiable attribute. |

#### 3.3.3 Reliability and Availability (NFR-REL)

| ID | Requirement |
|---|---|
| NFR-REL-001 | The system shall guarantee that concurrent acceptance attempts on one request result in exactly one assignment. |
| NFR-REL-002 | Analytics event capture shall survive downstream worker unavailability without data loss. |
| NFR-REL-003 | Scheduled lifecycle processes shall be idempotent and safe to re-run. |
| NFR-REL-004 | Cache unavailability shall degrade performance but shall not compromise correctness; the database remains authoritative. |

#### 3.3.4 Compliance and Privacy (NFR-COMP)

| ID | Requirement |
|---|---|
| NFR-COMP-001 | The system shall comply with statutory restrictions on Aadhaar identifier storage. |
| NFR-COMP-002 | The system shall support erasure of personal data across both transactional and archival tiers. |
| NFR-COMP-003 | Financial records shall not be deletable as a side effect of any other deletion; referential integrity shall be enforced by restriction. |
| NFR-COMP-004 | Administrative action records shall be retained indefinitely for audit. |

#### 3.3.5 Maintainability and Portability (NFR-MAINT)

| ID | Requirement |
|---|---|
| NFR-MAINT-001 | The schema shall conform to third normal form; deliberate denormalisation shall be documented with rationale. |
| NFR-MAINT-002 | Historical snapshots (contact details, address, pricing, commission) are explicitly permitted denormalisations and shall be labelled as such. |
| NFR-MAINT-003 | Schema changes shall be applied through versioned, ordered migrations validated in an ephemeral environment before promotion. |
| NFR-MAINT-004 | Configuration parameters shall be externalised rather than embedded in logic; the registry is maintained in `RULES_AND_LOGIC.md`. |

#### 3.3.6 Usability (NFR-USE)

| ID | Requirement |
|---|---|
| NFR-USE-001 | Emergency request submission shall be completable with evidence and questionnaire steps skipped. |
| NFR-USE-002 | Safety guidance shall be surfaced contextually when hazardous conditions are indicated. |
| NFR-USE-003 | Error conditions arising from concurrency shall be communicated in domain terms, distinguishing "already claimed" from "you have a scheduling conflict". |

---

## 4. Requirements Traceability

| Requirement group | Design authority |
|---|---|
| FR-AUTH, NFR-SEC | `DATABASE.md` §12 (RLS/RBAC matrix) |
| FR-CAT, FR-CLIENT | `DATABASE.md` §5 (Data dictionary) |
| FR-SOS, FR-SCHED, FR-LIFE | `WORKFLOWS.md` §1–§5 |
| FR-DISPATCH | `WORKFLOWS.md` §6; `RULES_AND_LOGIC.md` §7–§8 |
| FR-TECH | `RULES_AND_LOGIC.md` §1; `DATABASE.md` §9 |
| FR-TRACK, FR-CHAT | `ARCHITECTURE.md` §7; `DATABASE.md` §6 |
| FR-PAY | `WORKFLOWS.md` §9–§10; `RULES_AND_LOGIC.md` §3 |
| FR-REV | `RULES_AND_LOGIC.md` §4 |
| FR-VERIFY, FR-SAFETY | `ADMIN_CONSOLE.md` §5; `RULES_AND_LOGIC.md` §9 |
| FR-TRUST | `RULES_AND_LOGIC.md` §9 (operational vectors) |
| FR-DISP | `WORKFLOWS.md` §11; `ADMIN_CONSOLE.md` §3 |
| FR-ADMIN | `ADMIN_CONSOLE.md` (all sections) |
| FR-TELEM | `ARCHITECTURE.md` §9 |
| NFR-PERF | `DATABASE.md` §7–§8 |

---

## 5. Verification Approach

| Requirement class | Verification method |
|---|---|
| Concurrency invariants (FR-TECH-003/004/006, NFR-REL-001) | Database-level constraint tests plus concurrent-execution integration tests |
| Access control (FR-AUTH, NFR-SEC) | Policy assertion tests executed as each role against seeded fixtures |
| State machine (FR-LIFE) | Exhaustive transition-matrix tests including rejection of every invalid transition |
| Pricing and settlement (FR-PAY) | Scenario tests covering variance above, equal to and below estimate, including the refusal path |
| Spatial behaviour (FR-DISPATCH-001–004) | Fixture-based radius tests at each tier boundary |
| Telemetry non-interference (FR-TELEM-001/003) | Latency regression measurement on the transactional path with capture enabled and disabled |

---

## 6. Deferred Scope and Rationale

| Item | Status | Rationale |
|---|---|---|
| ML-driven dispatch triage | Deferred | No labelled outcome history exists. A deterministic engine is the production dispatcher until volume, per-category sample size, pipeline stability and label variance preconditions are jointly met. See `RULES_AND_LOGIC.md` §8. |
| Consumer cloud storage as analytics lake | Rejected | Structurally unsuitable: per-user API quotas, absence of an S3-compatible range-read interface, and consumer OAuth lifecycles incompatible with unattended workloads. See `ARCHITECTURE.md` §9. |
| Next.js migration | Deferred | The existing SPA satisfies current functional requirements; migration is a delivery-platform change, not a capability change. |
| Beneficiary tracking surface | Deferred | Requires an authentication-free, time-limited access mechanism not yet designed. |
| Computer-vision severity assessment | Deferred | Requires a separately labelled media dataset; evidence upload is optional, so coverage would be partial by construction. |
