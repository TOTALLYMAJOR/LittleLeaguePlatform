# Work Plan: Sponsor Program and Sponsor Portal Implementation

Created Date: 2026-08-19
Type: feature
Estimated Duration: 18-24 working days across 4 slices
Estimated Impact: ~34 files (10 migrations/tables, 3 new adapters, 2 extended adapters, 4 routes, 1 new page, 2 domain files, 1 deleted domain file, ~8 test files, 3 doc updates)
Related Issue/PR: n/a
Review Scope: `lib/domain/sponsor-*`, `lib/supabase/sponsor-*`, `lib/supabase/payments.ts`, `app/sponsor-portal/**`, `app/sponsor-link/**`, `app/api/admin/sponsors/**`, `components/sponsor-hub.tsx`, `supabase/migrations/*sponsor*`

## Related Documents

- Design Doc(s):
  - `docs/design/sponsor-program-design.md`
- ADR:
  - `docs/adr/0003-sponsor-revenue-spine-persistence.md`
  - `docs/adr/0004-sponsor-portal-access-without-a-fourth-role.md`
  - `docs/adr/0005-privacy-safe-sponsor-placement-metrics.md`
- UI Spec: `docs/ui-spec/sponsor-portal-ui-spec.md`
- PRD: `docs/prd/sponsor-program-prd.md`

## Verification Strategy (from Design Doc)

### Correctness Proof Method

- **Correctness definition**: every portal money figure equals the ledger fold for that invoice; no
  deliverable reports `delivered` without an evidence row; the portal response contains no
  family-originated value; no metrics table contains a person-identifying column; existing public
  placement output is unchanged.
- **Verification method**: property test over random ledger sequences; invariant query for
  `delivered` with zero evidence; executed leak test against a fully populated demo tenant; CI schema
  assertion over `sponsor_placement_*`; JSON output comparison of all six placement helpers.
- **Verification timing**: ledger and evidence proofs at end of Phase 2; leak test at end of Phase 3;
  schema assertion from Phase 4 onward and on every subsequent migration; output comparison during
  Phase 1 before the `sponsors.status` narrowing merges.

### Early Verification Point

- **First verification target**: Sponsor Hub reading a persisted agreement, invoice, and ledger, with
  a manual payment moving `paymentState` to `paid` and a dispute entry moving it to `disputed`.
- **Success criteria**: transitions occur with no status column written anywhere, provable by a
  database diff containing only ledger inserts; `getSponsorPlacement` output byte-identical.
- **Failure response**: stop before Phase 2. Every later phase assumes ledger derivation is cheap and
  correct; if it is not, the model must be reassessed rather than worked around.

### Proof Strategy

- **Proof obligation source**: red-test annotations in the Phase 1 and Phase 2 test skeletons for
  derivation and idempotency; for the privacy claims, the named artifact sources are the executed
  leak test output and the CI schema assertion, not code review.
- **Per-task propagation**: every task below carrying a claim records its proof obligation in the
  task's completion criteria.

## Quality Assurance Mechanisms (from Design Doc)

| Mechanism | Enforces | Config Location | Covered Files |
|---|---|---|---|
| `npm run typecheck` | Type contracts | `tsconfig.json` | project-wide |
| `npm test` | Unit and component behaviour | `package.json` | project-wide |
| `npm run build` | Route and render integrity | `next.config` | project-wide |
| `npm run lint` | Style and rule compliance | eslint config | project-wide |
| `make validate` | compose config + typecheck + test | `Makefile` | project-wide |
| `supabase/rls-policy.test.ts` | Literal policy-name assertions | `supabase/rls-policy.test.ts` | all 10 new tables |
| `npm run qa:sponsor-stripe-readiness` | Payment boundary contracts | `scripts/verify-sponsor-stripe-readiness.mjs` | sponsor payment sources |
| `npm run qa:sponsor-fulfillment-readiness` | Fulfillment contracts | `scripts/verify-sponsor-fulfillment-readiness.mjs` | sponsor fulfillment sources |
| Sponsor privacy schema assertion (new) | No person-identifying column on `sponsor_placement_*` | new verifier script | sponsor metrics migrations |

## Design-to-Plan Traceability

| Design Doc | DD Section | DD Item | Category | Covered By Task(s) | Gap Status | Notes |
|---|---|---|---|---|---|---|
| sponsor-program-design.md | Implementation Path Mapping | `sponsorship_agreements`, `sponsorship_invoices`, `sponsor_payment_ledger_entries` tables | impl-target | Phase 1 Task 1 | covered | |
| sponsor-program-design.md | Implementation Path Mapping | `sponsor_fulfillment_requirements`, `sponsor_fulfillment_evidence` | impl-target | Phase 2 Task 1 | covered | |
| sponsor-program-design.md | Implementation Path Mapping | `sponsor_portal_grants` + resolution RPC | impl-target | Phase 3 Task 1 | covered | |
| sponsor-program-design.md | Implementation Path Mapping | `sponsor_placement_events`, `sponsor_placement_daily_rollups` | impl-target | Phase 4 Task 1 | covered | |
| sponsor-program-design.md | Implementation Path Mapping | `sponsor_recap_reports`, `sponsor_renewal_reviews` | impl-target | Phase 4 Task 5 | covered | |
| sponsor-program-design.md | Main Components | `lib/domain/sponsor-program.ts` extension | contract-change | Phase 1 Task 2, Phase 2 Task 2, Phase 4 Task 3 | covered | Protected dir; authorized by ADR 0003 |
| sponsor-program-design.md | Interface Change Matrix | Retire `lib/domain/sponsor-billing.ts` | contract-change | Phase 1 Task 5 | covered | Deleted in the same commit as its last call site |
| sponsor-program-design.md | Interface Change Matrix | `createSponsorInvoiceCheckout` parameter rename + legacy fallback | contract-change | Phase 1 Task 4 | covered | |
| sponsor-program-design.md | Integration Points List | Stripe settlement writes a ledger entry | connection-switching | Phase 1 Task 4 | covered | |
| sponsor-program-design.md | Integration Points List | Placement anchors point at `/sponsor-link/[placementId]` | connection-switching | Phase 4 Task 2 | covered | |
| sponsor-program-design.md | Integration Points List | Route topology registration | connection-switching | Phase 3 Task 3, Phase 4 Task 2 | covered | |
| sponsor-program-design.md | Migration Strategy | Agreement backfill before `sponsors.status` narrowing | prerequisite | Phase 1 Task 3 | covered | |
| sponsor-program-design.md | Verification Strategy | Output comparison of six placement helpers | verification | Phase 1 Task 6 | covered | |
| sponsor-program-design.md | Verification Strategy | Ledger property test and dedupe proof | verification | Phase 1 Task 7 | covered | |
| sponsor-program-design.md | Verification Strategy | `delivered` implies evidence invariant query | verification | Phase 2 Task 5 | covered | |
| sponsor-program-design.md | Verification Strategy | Portal leak test | verification | Phase 3 Task 5 | covered | |
| sponsor-program-design.md | Verification Strategy | CI schema assertion on `sponsor_placement_*` | verification | Phase 4 Task 6 | covered | |
| sponsor-program-design.md | Security Considerations | Rate limits on both public routes | impl-target | Phase 3 Task 2, Phase 4 Task 2 | covered | |
| sponsor-program-design.md | Security Considerations | Redirect destination from stored URL only | impl-target | Phase 4 Task 2 | covered | |
| sponsor-program-design.md | Risks | Fire-and-forget write semantics spike | prerequisite | Phase 4 Task 0 | covered | Blocks Phase 4 Task 1 |
| sponsor-program-design.md | Test Boundaries | Demo tenant seeds all six golden states | verification | Phase 3 Task 4 | covered | |

## Reference Contract Values

| Design Doc (§ Section) | Contract Type | Required Observable Value (verbatim) | Covered By Task(s) |
|---|---|---|---|
| sponsor-program-design.md (§ State Transitions and Invariants) | state-lifecycle-negative | "No column anywhere stores a deliverable state or a payment state" | Phase 1 Task 2, Phase 2 Task 2 |
| sponsor-program-design.md (§ State Transitions and Invariants) | state-lifecycle-negative | "delivered is unreachable without an evidence row" | Phase 2 Task 2, Phase 2 Task 5 |
| sponsor-program-design.md (§ State Transitions and Invariants) | state-lifecycle-negative | "The ledger is append-only; enforced by a `before update or delete` trigger that raises, because the service-role adapter client bypasses RLS" | Phase 1 Task 1, Phase 1 Task 7 |
| sponsor-portal-ui-spec.md (§ Visual Acceptance) | derived-display | Golden state 2 — "No element anywhere on the page reads `live`, `delivered`, or `fulfilled`" when placements exist with zero evidence | Phase 3 Task 4 |
| sponsor-portal-ui-spec.md (§ Component: MetricBlock) | derived-display | Below threshold, the value is replaced by "below reporting threshold"; on read error the block shows "Measurement temporarily unavailable" and **never renders 0** | Phase 4 Task 4 |
| sponsor-portal-ui-spec.md (§ Component: ProofStrip) | structure-order | Five checkpoints in fixed order: agreement signed, payment received, logo approved, placements scheduled, recap delivered — never reordered or truncated | Phase 3 Task 4 |
| sponsor-program-design.md (§ Data Contracts) | derived-display | Every metric value is "either suppressed, unavailable, or a rollup-derived number" | Phase 4 Task 3, Phase 4 Task 4 |

## Failure Mode Checklist

| Category | Applies? | Covered By Task(s) |
|---|---|---|
| same-value | yes | Phase 1 Task 7 — duplicate `(provider, provider_event_id)` yields one row and returns success |
| no-op | yes | Phase 3 Task 2 — revoking an already-revoked grant is idempotent success |
| empty input | yes | Phase 3 Task 4 — agreement with zero requirements renders `EmptyState`, not a crash or a false `fulfilled` |
| invalid option | yes | Phase 3 Task 2 — malformed token rejected by pattern before hashing; Phase 4 Task 2 — non-uuid `placementId` returns 404 with no write |
| missing config | yes | Phase 1 Task 4 — payment gate closed and no Stripe account configured must degrade to manual recording, not error |
| unavailable boundary | yes | Phase 4 Task 3 — rollup read failure returns unavailable, never 0; Phase 4 Task 1 — event write failure leaves the host response unchanged |
| shared-state dependency | yes | Phase 1 Task 5 — the two money vocabularies must never both compile; deletion ships with the last call-site removal |
| rollback-only visibility | yes | Phase 1 Task 3 — agreement backfill must be verified reversible before `sponsors.status` narrowing merges |
| missing-sort-key ordering | yes | Phase 2 Task 3 — evidence list ordered by `observed_at` with a deterministic tiebreak on `id`; Phase 3 Task 4 — outstanding assets sort before approved |

## UI Spec Component → Task Mapping

| UI Spec Component (section heading) | States to Cover | Covered By Task(s) | Gap Status | Notes |
|---|---|---|---|---|
| § Component: ProgramStatusChip | default / loading / error / partial | Phase 3 Task 4 | covered | `disputed` overrides all other states |
| § Component: ProofStrip | default / loading / error / partial | Phase 3 Task 4 | covered | Fixed five-item order |
| § Component: DeliverableRow | default / loading / empty / error / partial | Phase 3 Task 4 | covered | |
| § Component: DeliveryStateBadge | default / loading / error | Phase 3 Task 4 | covered | Outline vs filled treatment |
| § Component: MetricBlock | default / loading / empty / error / partial / below-threshold | Phase 4 Task 4 | covered | "Not measured" list asserted non-empty |
| § Component: AssetChecklist | default / loading / empty / error / partial | Phase 3 Task 6 | covered | |
| § Component: LinkNoLongerActive | default | Phase 3 Task 2 | covered | Indistinguishable across all failure causes |
| § Component: SponsorGrantManager (admin, S-10) | default / loading / empty / error / partial / token-just-created | Phase 3 Task 3 | covered | Plaintext shown exactly once |

## ADR Bindings

| ADR | Source Section | Axis | Binding Decision | Covered By Task(s) |
|---|---|---|---|---|
| ADR 0003 | Decision | persistence | Payment ledger is append-only with `unique (provider, provider_event_id)`; balances are never stored | Phase 1 Task 1 |
| ADR 0003 | Implementation Guidance | contract_schema | `sponsor_packages` is adopted, not duplicated | Phase 1 Task 1 |
| ADR 0003 | Decision | contract_schema | No new enum value or workflow-state column for sponsor-facing status | Phase 1 Task 2, Phase 2 Task 2 |
| ADR 0003 | Implementation Guidance | data_flow | `provider: "manual"` is a first-class ledger provider | Phase 1 Task 4 |
| ADR 0003 | Decision | dependency_direction | `lib/supabase/sponsor-program.ts` depends on `lib/domain/sponsor-program.ts`, never the reverse | Phase 1 Task 2 |
| ADR 0004 | Decision | persistence | Grant stores SHA-256 hash only, constrained `~ '^[0-9a-f]{64}$'`, scoped to one `agreement_id` | Phase 3 Task 1 |
| ADR 0004 | Decision | data_flow | Grant resolution happens in a `security definer` RPC; the route authorizes nothing | Phase 3 Task 2 |
| ADR 0004 | Implementation Guidance | contract_schema | Portal adapter uses column allow-lists; `select("*")` prohibited | Phase 3 Task 2 |
| ADR 0004 | Implementation Guidance | data_flow | Sponsor-originated writes enter the existing `sponsor_assets` review queue as `pending` | Phase 3 Task 6 |
| ADR 0005 | Decision | persistence | No person-identifying column on any metrics table; `occurred_on` is `date` granularity | Phase 4 Task 1 |
| ADR 0005 | Implementation Guidance | data_flow | Suppression is applied in the read adapter, not by consumers | Phase 4 Task 3 |
| ADR 0005 | Implementation Guidance | data_flow | Rollups are the only read surface; raw events are never queried by a consumer | Phase 4 Task 3 |
| ADR 0001 | Decision | data_flow | Renewal recommendations require human approval before a sponsor sees them | Phase 4 Task 5 |
| ADR 0002 | Implementation Guidance | data_flow | Idempotent write returns the original result rather than erroring | Phase 1 Task 7 |

## Connection Map

| Boundary | Owner (left side) | Owner (right side) | Serialized Format | Consumer Parse Rule | Expected Signal | Covered By Task(s) |
|---|---|---|---|---|---|---|
| Admin UI → sponsor → portal URL | `SponsorGrantManager` | `app/sponsor-portal/[token]/page.tsx` | URL path segment, base64url, ≥ 43 chars | `^[A-Za-z0-9_-]{43,}$` then SHA-256 to 64 lowercase hex, matched against `token_hash` | A created grant's link resolves to that agreement; a rotated link does not | Phase 3 Task 1, Phase 3 Task 2 |
| Placement anchor → redirect route | placement render surfaces | `app/sponsor-link/[placementId]/route.ts` | URL path segment, uuid | uuid parse; unknown or inactive placement returns 404 with no write | 302 to the stored HTTPS sponsor URL; one `outbound_click` row; nothing about the requester persisted | Phase 4 Task 2 |
| Stripe webhook → ledger | `lib/supabase/payments.ts` | `sponsor_payment_ledger_entries` | Stripe event id string | Composite unique with `provider` | Replayed event leaves exactly one row and returns success | Phase 1 Task 4, Phase 1 Task 7 |
| Metric write → rollup | `lib/supabase/sponsor-metrics.ts` | `sponsor_placement_daily_rollups` | `date` (`occurred_on`) | Grouped by `(placement_id, surface_key, event_kind, occurred_on)` | Seeded events aggregate to the expected daily counts | Phase 4 Task 1, Phase 4 Task 3 |

## Objective

Make LeaguePilot able to sell a sponsorship it can prove. Persist the commercial spine that already
exists as pure TypeScript, make delivery provable through evidence rather than assertion, measure
placement exposure without ever identifying a person, and give the sponsor a surface where they can
see all of it without an account.

## Background

`docs/production-task-board.md:38` ranks sponsor billing priority 1 while
`docs/product-direction-2026-08.md:148` records `DEC-BILLING` as "keep proof-only." ADR 0003
resolves the contradiction in scoped form: build the sponsor product, keep the payment rails gated.
The prerequisites are unusually favourable — `lib/domain/sponsor-program.ts` already models the
correct spine and is already tested, `sponsor_packages` already exists as an orphan table waiting to
be adopted, and `lib/supabase/payments.ts` already contains a working gated Stripe Connect path.
What is missing is persistence, evidence, measurement, and a sponsor-facing surface.

## Risks and Countermeasures

### Technical Risks

- **Risk**: The portal read path widens over time until family data becomes reachable.
  - **Impact**: Catastrophic — a child-privacy breach to a commercial third party.
  - **Countermeasure**: Column allow-lists enforced by a static assertion, an executed leak test in
    CI against a fully populated demo tenant, and an ADR-level rule that broadening grant scope
    requires a new ADR.

- **Risk**: `sponsors.status` narrowing silently changes existing public placement output.
  - **Impact**: High — sponsors disappear from live pages.
  - **Countermeasure**: Agreement backfill precedes narrowing; JSON output comparison across all six
    placement helpers must show an empty diff before merge.

- **Risk**: Fire-and-forget write semantics on family-facing render paths are unconfirmed.
  - **Impact**: Medium — degraded family page performance.
  - **Countermeasure**: Phase 4 Task 0 is a blocking spike. If unconfirmed, counting moves entirely
    to the redirect endpoint and an explicit non-blocking queue, and render counting is dropped
    rather than forced.

- **Risk**: Stripe idempotency key change duplicates an in-flight Checkout session.
  - **Impact**: High — a sponsor charged twice.
  - **Countermeasure**: Migrated rows retain `sponsor-billing:{legacyId}`; only new invoices use
    `sponsor-invoice:{invoiceId}`.

### Schedule Risks

- **Risk**: Four slices is large enough to stall midway, leaving two money vocabularies coexisting.
  - **Impact**: High.
  - **Countermeasure**: Phase 1 is self-contained and ends with `sponsor-billing.ts` deleted. If work
    stops after Phase 1, the codebase is strictly better than it started.

- **Risk**: ~~Open items TBD-01 through TBD-04 block Phase 3 and Phase 4.~~
  - **Status**: Largely retired. TBD-01, TBD-02, and TBD-03 were resolved by the product owner on
    2026-08-19. Only TBD-04 (contrast check) remains, and it is an implementer task inside Phase 3
    rather than a blocker.

## Implementation Phases

Structure: **Option A — Vertical Slice**, per the Design Doc implementation approach.

### Phase Structure Diagram

```mermaid
flowchart LR
    P1["Phase 1<br/>Commercial spine<br/>admin-only"] --> P2["Phase 2<br/>Evidence and<br/>delivery derivation"]
    P2 --> P3["Phase 3<br/>Portal grants<br/>and sponsor surface"]
    P3 --> P4["Phase 4<br/>Metrics, recap,<br/>renewal"]
    P4 --> QA["Final Phase<br/>Quality Assurance"]
    P1 -.->|"safe stopping point"| STOP1["Codebase strictly improved:<br/>one money vocabulary"]
    P2 -.->|"safe stopping point"| STOP2["Admin can prove delivery"]
```

### Task Dependency Diagram

```mermaid
flowchart TB
    T11["P1T1 spine tables + RLS"] --> T12["P1T2 domain + adapter"]
    T12 --> T13["P1T3 backfill agreements"]
    T13 --> T14["P1T4 retarget payments"]
    T12 --> T15["P1T5 retire sponsor-billing.ts"]
    T13 --> T16["P1T6 output comparison"]
    T14 --> T17["P1T7 ledger proofs"]
    T17 --> T21["P2T1 evidence tables"]
    T21 --> T22["P2T2 delivery derivation"]
    T22 --> T23["P2T3 admin capture UI"]
    T22 --> T25["P2T5 invariant query"]
    T25 --> T31["P3T1 grants table + RPC"]
    T31 --> T32["P3T2 portal adapter + route"]
    T31 --> T33["P3T3 grant admin UI"]
    T32 --> T34["P3T4 portal surface"]
    T34 --> T35["P3T5 leak test"]
    T34 --> T36["P3T6 asset upload"]
    T35 --> T40["P4T0 fire-and-forget spike"]
    T40 --> T41["P4T1 metrics tables + write"]
    T41 --> T42["P4T2 redirect route"]
    T41 --> T43["P4T3 rollup + suppression"]
    T43 --> T44["P4T4 MetricBlock"]
    T44 --> T45["P4T5 recap + renewal"]
    T41 --> T46["P4T6 schema assertion"]
```

---

### Phase 1: Commercial Spine, Admin Only (Estimated commits: 6)

**Purpose**: First vertical slice. Persist the money model and prove derivation works against real
rows. No sponsor-facing surface exists at the end of this phase, deliberately.

**Verification**: Early verification point from the Verification Strategy.

**Entry criteria**: ADR 0003 moved to Accepted — **done 2026-08-19**. Phase approved by the product
owner 2026-08-19.

#### Tasks

- [x] **Task 1**: Migration — `sponsorship_agreements`, `sponsorship_invoices`,
      `sponsor_payment_ledger_entries`; extend `sponsor_packages` with `season_id` and typed
      `benefits`; RLS mirroring `0017`; ledger append-only enforced by a raising trigger as well as
      RLS, because the service-role client bypasses RLS; unique
      `(provider, provider_event_id)`; `legacy_billing_record_id` preserved on invoices.
- [x] **Task 2**: Extend `lib/domain/sponsor-program.ts` (authorized by ADR 0003) and add
      `lib/supabase/sponsor-program.ts`. **Proof obligation**: no status column is written by any
      code path in this task.
- [x] **Task 3**: Backfill — one `active` agreement per existing active sponsor for the current
      season; verify reversibility before narrowing `sponsors.status`.
- [x] **Task 4**: Retarget `lib/supabase/payments.ts` — Checkout reads `sponsorship_invoices` with a
      legacy id fallback; webhook settlement inserts a ledger entry via
      `normalizeSponsorProviderPaymentEvent`; add manual payment recording with `provider: "manual"`;
      audit event on manual recording.
- [x] **Task 5**: Replace `buildSponsorBillingProofs` at its three real call sites —
      `lib/domain/money-sponsors.ts:192`, `components/feature-panels.tsx:4022`, and
      `lib/domain/domain.test.ts:944` — remove `export * from "./sponsor-billing"` from
      `lib/domain/index.ts`, drop the dead `SponsorBillingProof` / `SponsorBillingInput` /
      `SPONSOR_BILLING_WORKFLOW_STATES` / `SponsorBillingWorkflowState` /
      `SPONSOR_PAYMENT_PROOF_STATUSES` / `SponsorPaymentProofStatus` declarations from
      `lib/domain/contracts.ts`, and delete `lib/domain/sponsor-billing.ts` **in the same commit**.
      `SPONSOR_BILLING_STATUSES` / `SponsorBillingStatus` are retained: they describe the persisted
      `sponsor_billing_records.status` enum, which this phase keeps readable, and they are referenced
      by the status-token union at `lib/domain/contracts.ts:320`.
- [x] **Task 6**: Output comparison across `getSponsorPlacement`, `getTeamPortalSponsorPlacement`,
      `getScheduleSponsorPlacement`, `getMediaGallerySponsorPlacement`, `getEmailSponsorPlacement`,
      `getBannerSponsorPlacement`. **Proof obligation**: empty JSON diff.
- [x] **Task 7**: Ledger proofs — property test folding random sequences; duplicate-event test
      yielding one row and success; executed test proving `update` and `delete` are rejected for
      every connection including a service-role client; cross-organization denial test.
- [x] Quality check (staged): `make validate`, `npm run build`, `npm run lint`.

#### Phase Completion Criteria

- [x] Early verification point passed: manual payment moves `paymentState` to `paid` and a dispute
      entry to `disputed`, with a database diff showing only ledger inserts.
- [x] `getSponsorPlacement` output byte-identical before and after.
- [x] Exactly one money vocabulary compiles in the repository.
- [x] `supabase/rls-policy.test.ts` carries literal policy names for all three new tables.
- [x] `npm run qa:sponsor-stripe-readiness` passes with updated source contract paths.

---

### Phase 2: Fulfillment Evidence and Delivery Derivation (Estimated commits: 4)

**Purpose**: Make `delivered` mean something. This is the phase that separates this product from a
billing screen.

**Verification**: Invariant query — zero rows where state is `delivered` and evidence count is 0.

**Entry criteria**: Phase 1 merged to `origin/main`. Implemented 2026-08-19 in
`supabase/migrations/20260819190000_sponsor_fulfillment_evidence.sql`.

#### Tasks

- [x] **Task 1**: Migration — `sponsor_fulfillment_requirements`, `sponsor_fulfillment_evidence`
      with `kind` in (`screenshot`, `link`, `event_recap`, `attendance_summary`, `campaign_note`),
      `observed_at`, `captured_by_user_id`, artifact reference; requirements generated from package
      benefits; RLS org-scoped. A `before insert or update` trigger rejects a future `observed_at`
      for every connection, and evidence carries no update or delete grant.
- [x] **Task 2**: `deriveDeliverableState(requirement, placements, evidence)` in
      `lib/domain/sponsor-program.ts`. **Proof obligation**: `delivered` unreachable without an
      evidence row, proven by test, not by inspection — `lib/domain/__tests__/sponsor-fulfillment-derivation.test.ts`
      sweeps four of the seven requirement kinds against placement and artwork combinations at one
      fixed clock with an empty evidence list and asserts none of them yields `delivered`. Widening
      the sweep to all seven kinds and a varying clock is outstanding (Codex review 2026-08-19).
- [x] **Task 3**: Admin evidence capture — `app/api/admin/sponsors/evidence/route.ts` plus Sponsor
      Hub UI; `observed_at` in the future is rejected; evidence list ordered by `observed_at` with an
      `id` tiebreak.
- [x] **Task 4**: Extend `listSponsorAdminData` with requirements and derived delivery state; Sponsor
      Hub shows scheduled versus delivered per deliverable.
- [x] **Task 5**: Invariant query added to the fulfillment readiness verifier
      (`supabase/sponsor-fulfillment-invariants.sql`); extended
      `npm run qa:sponsor-fulfillment-readiness` with a `fulfillment-evidence-derivation` family,
      backed by four new negative cases in the verifier's own test.
- [x] Quality check (staged): `make validate`, `npm run build`, `npm run lint`,
      `npm run qa:sponsor-fulfillment-readiness`, `node --test scripts/verify-sponsor-fulfillment-readiness.test.mjs`.

#### Phase Completion Criteria

- [x] An admin can attach evidence and watch a deliverable move from `scheduled` to `delivered`.
      Covered by adapter and derivation tests. There is no evidence-route test, and the adapter
      tests mock the service-role client, so they do not exercise RLS. The signed-in browser journey
      is not proven and remains under the `hosted fulfillment evidence proof` gate.
- [x] Invariant query returns zero rows and is wired into the verifier. Run transactionally against
      the local Supabase database on 2026-08-19 and rolled back: backfill collapsed a duplicate
      benefit line, a future observation was rejected, pointer evidence without an artifact and
      written evidence without a note were rejected, `service_role` insert succeeded while update
      and delete were denied, `anon` had no privilege and a non-admin `authenticated` reader saw
      zero rows, and evidence cascaded out with its requirement.
- [x] No deliverable state is stored in any column. Enforced by the migration, asserted by
      `supabase/rls-policy.test.ts`, by the verifier, and by invariant 1 of the invariant file.
- [x] Cross-organization denial tests pass for both new tables. Note the limit found on
      2026-08-19: `supabase/rls-policy.test.ts` asserts policy names, not their `using` clauses, so
      it would pass against `using (true)`. No same-organization composite foreign key backs the
      policies.

---

### Phase 3: Portal Grants and Sponsor Surface (Estimated commits: 6)

**Purpose**: The sponsor sees it. Highest-risk phase — first external principal, first surface
outside authenticated roles.

**Verification**: Executed leak test against a fully populated demo tenant.

**Entry criteria**: ADR 0004 Accepted. TBD-01 resolved 2026-08-19 (**grant expiry = season end**);
TBD-02 resolved 2026-08-19 (**HTTPS URL, not file upload**).

#### Tasks

- [ ] **Task 1**: Migration — `sponsor_portal_grants` with
      `token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$')`, `agreement_id`,
      `expires_at`, `revoked_at`, `last_accessed_at`, `access_count`; `security definer` RPC
      `resolve_sponsor_portal_grant(target_token_hash)` with `set search_path = public` and execution
      revoked from `public, anon`.
- [ ] **Task 2**: `lib/supabase/sponsor-portal.ts` — hash, resolve, allow-listed reads. **Proof
      obligation**: static assertion that no `select("*")` appears in this module. Add
      `PUBLIC_RATE_LIMITS.sponsorPortalLookup`. Invalid, expired, and revoked return one
      indistinguishable result.
- [ ] **Task 3**: `app/api/admin/sponsors/grants/route.ts` + `SponsorGrantManager` UI; plaintext token
      shown exactly once with an explicit warning; revoke is idempotent; audit events on create and
      revoke; **token never logged in any path**.
- [ ] **Task 4**: `app/sponsor-portal/[token]/page.tsx` and portal components per the UI Spec —
      `PortalHeader`, `ProgramStatusChip`, `ProofStrip`, `NextStepCard`, `DeliverableRow`,
      `DeliveryStateBadge`, `EvidenceList`, `InvoiceSummary`, `LedgerTimeline`. Register both public
      routes in `lib/navigation/route-topology.ts`, nav-excluded. Extend
      `scripts/bootstrap-demo-tenant.mjs` so UI Spec golden states 1–6 are all reachable.
- [ ] **Task 5**: Leak test — assert the portal response contains no value from `players`,
      `profiles`, `guardian_authorizations`, `emergency_contacts`, `player_health_notes`,
      `team_memberships`, or any media table, run against a tenant where all are populated. Assert
      revoked, expired, and never-existed responses are identical.
- [ ] **Task 6**: Sponsor asset upload — creates `sponsor_assets` with `status = 'pending'`; proves no
      placement goes live; HTTPS validation reused from `saveSponsor`.
- [ ] **Task 7**: Responsive and accessibility proof at 320, 390, 768, 1024, 1440 px into
      `output/playwright/sponsor-portal/`; resolve TBD-04 contrast check.
- [ ] Quality check (staged).

#### Phase Completion Criteria

- [ ] A sponsor opens a link and sees their agreement with correct scheduled/delivered states.
- [ ] Leak test passes; revoked/expired/invalid are indistinguishable.
- [ ] Golden state 2 verified: with placements and zero evidence, no element reads `live`,
      `delivered`, or `fulfilled`.
- [ ] Zero WCAG 2.2 AA violations at all five widths.
- [ ] `USER_ROLES` unchanged; no RLS helper modified.

---

### Phase 4: Metrics, Recap, and Renewal (Estimated commits: 6)

**Purpose**: Give the sponsor a number that is true, and a reason to renew.

**Verification**: CI schema assertion plus threshold and redirect tests.

**Entry criteria**: ADR 0005 Accepted. TBD-03 resolved 2026-08-19 (**recap is a server-rendered page
at a stable URL**; no PDF dependency, so no additional ADR is required).

#### Tasks

- [ ] **Task 0** *(blocking spike)*: Confirm fire-and-forget write semantics in this Next.js version.
      If unconfirmed, drop render counting from the render path and count only through the redirect
      endpoint plus an explicit non-blocking queue. **Blocks Task 1.**
- [ ] **Task 1**: Migration — `sponsor_placement_events` (`occurred_on date`, `event_kind`,
      `surface_key` reusing the existing five `placement_key` values) and
      `sponsor_placement_daily_rollups`; 90-day retention on raw events. **Proof obligation**: no
      `user_id`, session id, IP, user agent, referrer, or device column exists. Add
      `recordPlacementRender` with bot and prefetch exclusion at write time.
- [ ] **Task 2**: `app/sponsor-link/[placementId]/route.ts` — 302 to the stored HTTPS sponsor URL
      only, never a request value; 404 without a write for unknown or inactive placements;
      `PUBLIC_RATE_LIMITS.sponsorLinkRedirect`; placement anchors repointed.
- [ ] **Task 3**: Rollup job plus `loadPlacementMetrics` with suppression applied **in the adapter**;
      consumers cannot query raw events.
- [ ] **Task 4**: `MetricBlock` per the UI Spec. **Proof obligation**: component test asserts a
      non-empty "not measured" list, that 24 events render threshold copy, that 25 render a number,
      and that a read error renders "temporarily unavailable" and never 0.
- [ ] **Task 5**: `sponsor_recap_reports` and `sponsor_renewal_reviews`;
      `lib/services/sponsor-recap/` assembly from evidence and rollups only. **Proof obligation**:
      every recap claim traces to a persisted row. Renewal recommendation is not displayed to the
      sponsor until `approved_at` is set (ADR 0001).
- [ ] **Task 6**: Sponsor privacy schema assertion verifier wired into CI, failing on any
      person-identifying column added to a `sponsor_placement_*` table.
- [ ] **Task 7**: Latency measurement proving placement counting adds < 15 ms p95; test proving a
      metric write failure leaves the host response unchanged in status and body.
- [ ] Quality check (staged).

#### Phase Completion Criteria

- [ ] Renders and outbound clicks accrue and display with honest labels.
- [ ] Threshold behaviour proven at 24 and 25 events.
- [ ] Schema assertion green and wired into CI.
- [ ] Recap contains no modelled or interpolated value.
- [ ] Unapproved renewal recommendation is not visible in the portal.
- [ ] Added latency under 15 ms p95 on placement-rendering surfaces.

---

### Final Phase: Quality Assurance (Required) (Estimated commits: 1)

**Purpose**: Cross-cutting quality assurance and Design Doc consistency verification.

#### Tasks

- [ ] Verify all Design Doc acceptance criteria AC-001 through AC-019 achieved
- [ ] Security review: portal allow-lists, token handling, redirect safety, rate limits, RLS denials
- [ ] Quality checks: `make validate`, `npm run build`, `npm run lint`
- [ ] Execute all tests including leak, denial, and threshold tests
- [ ] Coverage review for changed behaviour; record any gap with the alternative verification used
- [ ] Update `docs/Features.md` (definition of done requires it)
- [ ] Update `docs/capability-matrix.md` sponsor management and money+sponsors rows
- [ ] Update `docs/production-task-board.md` LP-020 and LPM-010 with actual state and remaining gates
- [ ] Move ADR 0003, 0004, 0005 to Accepted with dates
- [ ] Record explicitly which gates remain open: hosted proof, Supabase readback, RLS live proof,
      Stripe sandbox and settlement, finance reconciliation, accessibility audit, production sponsor
      acceptance

### Quality Assurance

- [ ] Quality check (staged)
- [ ] All tests pass
- [ ] Static check pass
- [ ] Lint check pass
- [ ] Build success

## Completion Criteria

- [ ] All phases completed
- [ ] Design Doc acceptance criteria satisfied
- [ ] Staged quality checks completed (zero errors)
- [ ] All tests pass
- [ ] `docs/Features.md`, `docs/capability-matrix.md`, `docs/production-task-board.md` updated
- [ ] No claim of hosted, provider, finance, or production acceptance is made from local evidence
- [ ] User review approval obtained

## Progress Tracking

### Phase 1
- Start: 2026-08-19
- Complete: 2026-08-19
- Notes: Approved 2026-08-19; ADR 0003 Accepted. Task 5 scope corrected after code inspection: the
  retired builder's real call sites are `money-sponsors.ts`, `feature-panels.tsx`, and
  `domain.test.ts`, not `sponsor-hub.tsx` as originally written.
- Two deviations from the written plan, both strengthening it:
  1. Append-only is enforced by a raising `before update or delete` trigger in addition to withheld
     grants. RLS alone was insufficient because `createSupabaseAdminClient` connects as
     `service_role` and bypasses row level security. The trigger permits referential cascade cleanup
     by checking whether the parent invoice still exists.
  2. `charge.refunded` and `charge.dispute.created` were added to the webhook handler. The domain
     normalizer already supported both, and without them a reversed payment would keep folding to
     "paid", which would have failed AC-004.
- `sponsors.status` was not narrowed by constraint. The column keeps `pending | active | expired` and
  every stored value; only its meaning changed, with deal state moving to
  `sponsorship_agreements.status`. This is what makes the Task 6 output comparison a real guard
  rather than a circular one.
- Local evidence only: typecheck, 786 tests, lint, production build,
  `npm run qa:sponsor-stripe-readiness`, and `npm run qa:sponsor-fulfillment-readiness` all pass.
  Hosted proof, Supabase readback, executed RLS denial proof, executed append-only trigger proof
  against a live target, Stripe sandbox settlement proof, and finance reconciliation remain open.
- The default 5s vitest timeout flakes under this machine's parallel load; a different unrelated file
  times out on each run. At `--testTimeout=30000` all 133 files and 786 tests pass. This is a
  pre-existing environment characteristic, not a regression from this phase.

### Phase 2
- Start: 2026-08-19
- Complete: 2026-08-19
- Notes: Delivery state is derived, never stored. `deriveDeliverableState(requirement, placements,
  evidence, context)` and its `deriveSponsorDeliverables` fold live in `lib/domain/sponsor-program.ts`;
  the migration `20260819190000_sponsor_fulfillment_evidence.sql` adds
  `sponsor_fulfillment_requirements` and `sponsor_fulfillment_evidence` with no state, delivered
  count, or delivered timestamp column on either table.
- Enforcement, stated accurately after the 2026-08-19 Codex review corrected an earlier overclaim
  in these notes:
  1. Evidence is append-only, enforced the way Phase 1 enforces the payment ledger. The review found
     this missing and it was fixed on 2026-08-19: `revoke update, delete ... from service_role`
     withdraws the default privileges a grant cannot take away, and
     `sponsor_fulfillment_evidence_append_only` on a `before update or delete` trigger binds the
     table owner as well. The delete branch still permits referential cascade cleanup, on the same
     parent-exists test Phase 1 uses.
  2. A `before insert or update` trigger rejects `observed_at` more than one minute in the future
     for every connection. The one-minute window is a deliberate clock-skew allowance; the rule is
     "no meaningfully future observation", not "no future observation".
  3. Pointer evidence (`screenshot`, `link`) must carry its artifact reference and written evidence
     (`event_recap`, `attendance_summary`, `campaign_note`) must carry its note, enforced in the
     schema rather than only at the route. The URL check is `~* '^https://'`, which accepts the bare
     string `https://`.
- The `delivered`-requires-evidence obligation is tested, but the sweep is narrower than first
  recorded here: `lib/domain/__tests__/sponsor-fulfillment-derivation.test.ts` covers four of the
  seven requirement kinds (`league_homepage_logo`, `newsletter_placement`, `field_banner`,
  `season_recap`) against placement and artwork combinations at one fixed clock. It does not sweep
  every kind or every clock.
- `supabase/sponsor-fulfillment-invariants.sql` holds five executable zero-row invariants plus one
  commented-out report (invariant 2, requirements without evidence, which is expected to be
  non-empty mid-season). It is wired into `npm run qa:sponsor-fulfillment-readiness` as the
  `fulfillment-evidence-derivation` family, with four new negative cases in the verifier's own test.
  The verifier is source-pattern-based: it passed while the append-only trigger was missing, so it
  is not proof that the guarantee holds.
- Local evidence only, all re-run on 2026-08-19 against the final working tree: `make validate`
  (docker compose config + typecheck + 134 files / 809 tests), `npm run build`, `npm run lint`
  (0 errors; the 3 remaining warnings are pre-existing and in files this phase did not touch),
  `npm run qa:sponsor-fulfillment-readiness` PASS, `npm run qa:sponsor-stripe-readiness` PASS, and
  `node --test scripts/verify-sponsor-fulfillment-readiness.test.mjs` 12/12.
- The invariant file was executed transactionally against the local Supabase database on 2026-08-19
  and rolled back. That is local proof. The signed-in browser journey for evidence capture is not
  proven and stays under the `hosted fulfillment evidence proof` gate, alongside hosted browser
  proof, observed placement rendering, and finance reconciliation.

#### Codex review, 2026-08-19 — Phase 2 not committable as written

Independent review by the Codex agent, findings verified against the files before being recorded.

Blockers, all three fixed on 2026-08-19:
1. Evidence was not append-only. `service_role` retained default update and delete, and the Phase 1
   trigger pattern had not been carried forward. **Fixed**: explicit
   `revoke update, delete ... from service_role` plus a `before update or delete` trigger.
2. Tenant identity was denormalized with no same-organization composite foreign key. A requirement's
   `organization_id` was not constrained to its agreement's organization, and evidence's was not
   constrained to its requirement's, so RLS trusted a child row's stored `organization_id` and a
   bypassing writer could make one organization's rows readable across a tenant boundary.
   **Fixed**: `uq_sponsorship_agreements_id_organization` on the Phase 1 table, `unique
   (id, organization_id)` on requirements, and composite foreign keys on both children. The
   cross-tenant row is now unrepresentable rather than merely detectable after the fact.
3. The backfill yielded zero requirements for the repository's canonical package data. Two causes,
   not one: `scripts/bootstrap-demo-tenant.mjs` wrote `benefits` as plain strings while the backfill
   reads `entry->>'kind'`, **and** the seeder wrote no `sponsorship_agreements` row at all, so the
   backfill's join had nothing to join to regardless of benefit shape. The second cause is Phase 1
   debt the review did not name. **Fixed**: the seeder now writes structured benefits carrying a
   requirement `kind`, sets the package's `season_id`, and seeds the per-season agreement.

Should-fix: no idempotency key or uniqueness guard on evidence, and the audit insert result is
ignored, so a retried write inflates `deliveredQuantity` and a failed audit still returns success;
the Sponsor Hub "Delivery proof" check reads deliverable state only and can read complete while
`deliveredQuantity < requiredQuantity`; `league_homepage_logo`, `sport_homepage_logo`, and
`team_page_logo` all map to the `team_portal` placement key, so one active placement reports three
distinct benefits as scheduled; the RLS test asserted policy names but not their `using` clauses, so
`using (true)` would have passed it (fixed 2026-08-19 as part of blocker 2, since the composite keys
are only half of what makes the tenant boundary real).

Nit: the evidence route returns 400 for authorization failures where the contract specifies 403,
and the pre-authorization requirement lookup makes the differing messages a weak existence oracle.

What the review confirmed held: no path presents `delivered` with an empty evidence list; neither
table persists state, delivered count, or delivered timestamp; the route takes its actor from the
verified session; only the authorized module under `lib/domain/` was touched; no enum or workflow
state was added; no Supabase client or provider call entered UI code.

**Executed proof of the blocker fixes, 2026-08-19.** Phase 1 and Phase 2 were applied to the local
Supabase database inside one transaction and rolled back. Nine assertions passed against real
PostgreSQL rather than against source patterns: the backfill generated two requirements from
structured benefits and honored a quantity of two; a cross-organization requirement and a
cross-organization evidence row were both rejected with a foreign key violation; `service_role`
insert was permitted while its update and delete were denied; the table owner's update was denied by
the trigger; evidence was still removed by cascade when its requirement was deleted; and a future
observation was still rejected. This is local proof against a local target. It is not hosted proof,
not a Supabase readback of an applied migration, and not production acceptance — those gates stay
open.

**Verifier gap closed.** The review's sharpest point was that
`npm run qa:sponsor-fulfillment-readiness` passed while the append-only guarantee it reports on was
absent. Three checks were added — `EVIDENCE_APPEND_ONLY_MISSING`, `TENANT_COMPOSITE_KEY_MISSING`,
and `UNSTRUCTURED_PACKAGE_BENEFITS_PRESENT` — and each was negative-tested by removing the
corresponding guarantee and confirming the verifier fails, with four matching cases added to the
verifier's own test. A source-pattern verifier still only catches what it is told to look for; that
limit is unchanged.

**One review finding was incorrect.** Codex reported "No evidence-route test exists". Three exist in
`app/api-live-actions.test.ts`, including one that posts `actorUserId: "client-spoof"` and asserts
the adapter is called with the session user instead, plus future-observation and unsupported-kind
rejections that assert no write is attempted. The finding was checked against the files and dropped
rather than acted on.

#### Should-fix pass, 2026-08-19

All five remaining review findings were fixed after the Phase 2 commit at `4062a95`, in migration
`20260819210000_sponsor_fulfillment_evidence_capture.sql` and the code around it.

1. **Capture is atomic and replay-safe.** Evidence and its audit event were two independent inserts
   whose audit result was ignored, so an admin-sensitive write could succeed with no audit trail --
   and because evidence is append-only, it could not be withdrawn afterwards. Both now happen inside
   `record_sponsor_fulfillment_evidence`, one transaction. Evidence also gained a natural key,
   `unique nulls not distinct (requirement_id, kind, observed_at, artifact_url, note)`; a
   resubmission returns the observation already recorded with `replayed: true` and writes nothing.
   `nulls not distinct` is what makes that hold for written evidence, which has no artifact, and
   pointer evidence, which has no note. This matters because delivered quantity is a count of
   evidence rows: without the key, one observation submitted twice could satisfy a benefit that
   promised two.
2. **Delivery proof respects promised quantity.** The Sponsor Hub check read complete whenever every
   deliverable was `delivered`, which is true after a single observation. It now also requires
   `deliveredQuantity >= requiredQuantity`, so a card can no longer show "1 of 2 observed" beside a
   completed check.
3. **Promised surfaces no longer borrow each other's placements.** `league_homepage_logo` and
   `sport_homepage_logo` mapped to `team_portal`, so one active team-portal placement reported three
   distinct promised surfaces as scheduled. They now map to null. The placement taxonomy in
   `0002_platform_hardening.sql` has no league or sport homepage key, so those benefits reach
   `delivered` through evidence alone -- which is what the code comment already claimed and the code
   did not do.
4. **The derivation sweep covers the whole taxonomy.** All seven requirement kinds, three clocks
   spanning before, inside, and after every placement window, both artwork states, and a blocked
   variant of each -- still asserting no combination yields `delivered` from an empty evidence list.
5. **Authorization answers as authorization.** The route returned 400 for every failure including
   "not an admin", and looked the requirement up before authorizing, so the differing messages told
   an unauthorized caller whether an id was real. It now returns 403 for a refusal and 503 for a
   degraded dependency, and a missing requirement is refused in the same words as a forbidden one.

Authority moved from the adapter into SQL as part of item 5, which is stricter rather than looser:
it binds any caller of the function, not only the adapter that usually calls it. The verifier check
that asserted the adapter-side call was rewritten to assert the SQL derivation rather than dropped.

**Executed proof, 2026-08-19.** All three migrations applied to the local Supabase database in one
transaction and rolled back. Four assertions passed against real PostgreSQL: a resubmitted capture
folded onto one evidence row and one audit event; a different `observed_at` recorded separately; a
deliberately failed audit write took the observation with it, leaving no evidence row behind; and a
non-admin was refused with a message identical to the one a missing requirement returns. Two schema
facts were found this way rather than by reading -- `audit_events.target_id` is `text`, now cast
explicitly, and the local database already carries an active admin membership.

Gates after the pass: `make validate` (134 files / 815 tests), `npm run build`, `npm run lint` at
zero errors, both sponsor readiness verifiers PASS, and the verifier's own node tests. Hosted proof,
Supabase readback, Stripe settlement, finance reconciliation, and production acceptance remain open.
- The Phase 1 vitest timeout characteristic persists: at the default 5s timeout one unrelated file
  times out under this machine's parallel load (this run it was
  `lib/supabase/official-communications.test.ts`), and at `--testTimeout=30000` all 134 files and
  809 tests pass. Pre-existing environment behavior, not a regression from this phase.

### Phase 3
- Start: —
- Complete: —
- Notes: TBD-01 and TBD-02 resolved 2026-08-19; TBD-04 remains an in-phase implementer task.

### Phase 4
- Start: —
- Complete: —
- Notes: Task 0 remains a blocking spike. TBD-03 resolved 2026-08-19 (stable URL).

## Notes

- Phase 1 is a safe stopping point. If work halts after it, the repository is strictly better than it
  started: one money vocabulary instead of three, and `sponsor_packages` no longer dead schema.
- Local browser evidence under `output/playwright/sponsor-portal/` is local proof only and is never
  hosted or production acceptance, consistent with how every other slice in this repository records
  its evidence.
- TBD-01 (season end), TBD-02 (HTTPS URL), and TBD-03 (stable URL) were resolved by the product
  owner on 2026-08-19 and are recorded in the UI Spec and ADR 0004. TBD-04 remains and is an
  implementer task inside Phase 3.
