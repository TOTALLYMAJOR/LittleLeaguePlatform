---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-25
---
# ADR 0003 - Sponsor Revenue Spine Persistence

## Status

Accepted

Accepted 2026-08-19. Phase 1 of `docs/plans/20260819-feature-sponsor-program.md` is approved for
implementation.

Supersedes the sponsor-program scope of `DEC-BILLING` as recorded in
`docs/product-direction-2026-08.md:148`. Does not supersede `DEC-BILLING` for family-facing
registration or team-due collection, which remain proof-only.

## Context

The repository contradicts itself on sponsor billing.

`docs/production-task-board.md:38` ranks "Sponsor billing domain and live collection" as priority 1,
describing it as "the clearest business monetization path," and `docs/production-task-board.md:48`
specifies the durable model in detail: Sponsor → Sponsorship Agreement → Sponsorship Package →
Sponsorship Invoice → Payment → Refund/Dispute → Fulfillment Requirement → Fulfillment Evidence →
Renewal.

`docs/product-direction-2026-08.md:148` records the opposite under `DEC-BILLING`: "Revenue
infrastructure for a product without users. Keep proof-only."

Both are current. Implementation has stalled in the gap between them, and the artefacts show it:

1. `lib/domain/sponsor-program.ts` implements exactly the task-board model — agreements, packages,
   invoices, a normalized payment ledger, fulfillment requirements, placement readiness, and recap
   readiness — as pure TypeScript wired to no route, no table, and no adapter.
2. `public.sponsor_packages` (`0002_platform_hardening.sql:298`) exists with `benefits jsonb`, is
   written only by `scripts/bootstrap-demo-tenant.mjs:972`, and is read by zero application code.
   `sponsors.package_id` (`0002_platform_hardening.sql:310`) is referenced nowhere in `lib/` or
   `app/`.
3. Three incompatible money vocabularies coexist: `lib/domain/sponsor-billing.ts`
   (`draft | invoice_ready | payment_recorded`), the `sponsor_billing_records.status` check
   constraint with the same three values, and `lib/domain/sponsor-program.ts`
   (`paymentState: not_invoiced | awaiting_payment | partially_paid | paid | refunded | disputed`).
4. `public.sponsors.status` (`0007_sponsor_v2_status.sql`) carries `pending | active | expired` and
   is simultaneously used as business-entity state, deal state, and public-display eligibility.

The deciding observation is that the two documents are arguing about different things.
`DEC-BILLING`'s reasoning — "a product without users" — is a statement about **family** adoption.
It is correct that building registration payment rails before families arrive is premature. But a
sponsor does not buy from families. A sponsor buys local visibility and community trust **from a
league**, and the league exists the moment one admin signs up. Sponsor revenue is the single
monetization path in this product whose value does not scale with family install base.

A decision is required because this changes where sponsor commercial state is stored — in-memory
TypeScript to Postgres — which is a storage-location data-flow change, and because it moves
responsibility for money vocabulary between three existing modules.

## Decision

Persist the sponsor commercial spine in Postgres, make `lib/domain/sponsor-program.ts` the single
authoritative money and fulfillment vocabulary, and keep live charge collection gated.

### Decision Details

| Item | Content |
|---|---|
| **Decision** | Persist Sponsor → Agreement → Package → Invoice → append-only Payment Ledger → Fulfillment Requirement → Fulfillment Evidence as organization-scoped tables, with `lib/domain/sponsor-program.ts` as the only money vocabulary and all sponsor-facing status derived rather than stored. |
| **Why now** | The domain model is already written and already correct; it is the only thing standing between the product and a sellable, provable sponsor offer. Every further sponsor feature built without it deepens the three-vocabulary split. |
| **Why this** | It is the option that resolves the documented contradiction honestly — it builds sponsor **proof**, which is the actual blocker, without enabling the payment rails `DEC-BILLING` warned against. |
| **Known unknowns** | Whether leagues will reliably capture fulfillment evidence by hand; whether manual payment recording is sufficient for a first season, or whether gated Stripe collection is demanded immediately. |
| **Kill criteria** | If, after one full pilot season, fewer than half of delivered requirements carry an evidence row, the evidence model is not workable as designed and the fulfillment half of this decision must be reconsidered before further investment. |

Concretely:

- New tables `sponsorship_agreements`, `sponsorship_invoices`, `sponsor_payment_ledger_entries`,
  `sponsor_fulfillment_requirements`, `sponsor_fulfillment_evidence`, all organization-scoped with
  RLS matching the `sponsor_billing_records` posture.
- `public.sponsor_packages` is **adopted**, not duplicated. It gains `season_id` and a typed
  `benefits` contract aligned to `FulfillmentRequirementKind`.
- `sponsors.status` narrows to business-entity state. Deal state moves to
  `sponsorship_agreements.status`, which already has the vocabulary
  `draft | sent | signed | active | expired | cancelled` in the domain scaffold. Display eligibility
  remains a property of `sponsor_placements` plus approved assets, as it already is.
- The payment ledger is **append-only** with `unique (provider, provider_event_id)`. Balances are
  never stored; they are folded from the ledger by `buildSponsorshipProgramSummary`.
- `lib/domain/sponsor-billing.ts` is retired. Its only structural contribution,
  `sponsor_billing_records`, is migrated into `sponsorship_invoices` and preserved for the
  existing Stripe Checkout path.
- **No new enum value and no new workflow state** is introduced for sponsor-facing status. The
  portal status chip is a pure function over agreement status, ledger rows, requirement rows, and
  evidence rows, per hard rule 2.
- Live charge collection stays behind `loadPaymentGate` (`lib/supabase/payments.ts:191`). An
  invoice can be issued and a payment recorded manually with a ledger entry of
  `provider: "manual"`, which the existing `SponsorPaymentLedgerEntry` contract already supports.

## Rationale

### Options Considered

| Option | Resolves contradiction | Single money vocabulary | Provable delivery | Enables gated live collection | New schema |
|---|---|---|---|---|---|
| A. Honour `DEC-BILLING` literally — keep everything proof-only | No, freezes it | No, keeps three | No | No | None |
| B. Honour the task board literally — persist spine **and** enable Stripe collection now | Partially — ignores the valid half of `DEC-BILLING` | Yes | Only if fulfillment also built | Enabled by default | Large |
| C. Persist spine, keep collection gated, derive all status (**chosen**) | Yes, scoped | Yes | Yes | Available, off by default | Large |
| D. Extend `sponsor_billing_records` in place, skip agreements | No | No — entrenches the weakest vocabulary | No | Partially | Small |

**Option A** is the status quo. It leaves the correct domain model unreachable, leaves
`sponsor_packages` an orphan table, and leaves the product unable to answer a sponsor's first
question. It also does not actually reduce risk, because the three-vocabulary split keeps growing.

**Option B** builds the right model but ignores the half of `DEC-BILLING` that is correct. Turning
on collection by default puts real money movement in front of a product that cannot yet prove
delivery — which is precisely the refund and trust risk that `docs/production-task-board.md:39`
identifies. Charging before proving is the failure mode, not a milestone.

**Option D** is the cheapest and the worst. `sponsor_billing_records` has no agreement concept, so
it cannot express a per-season deal, cannot express partial payment against a deal, and cannot hang
fulfillment requirements off anything. Extending it would make the weakest of the three vocabularies
the winner by default.

**Option C** is chosen because it separates the two questions `DEC-BILLING` and the task board were
conflating. Building the sponsor **product** is justified now, because sponsor value does not depend
on family adoption. Turning on the payment **rails** is not justified now, and stays gated. The
existing domain scaffold means the highest-risk part — the money folding logic — is already written
and already tested in `lib/domain/domain.test.ts`.

### Positive Consequences

- One money vocabulary, owned by `lib/domain/`, where the project's other invariants already live.
- `sponsor_packages` and `sponsors.package_id` stop being dead schema.
- A dispute, refund, or partial payment produces correct state without an admin hand-editing a
  status field, because balances fold from an append-only ledger.
- Fulfillment requirements gain a real parent row, which is the prerequisite for every subsequent
  sponsor slice — evidence, portal, metrics, recap, renewal.
- The existing Stripe Checkout path (`lib/supabase/payments.ts:165`) keeps working and gains a
  correct destination for settlement events, without being switched on.

### Negative Consequences

- Five new tables plus RLS policies, denial tests, and retention statements to maintain.
- A migration of `sponsor_billing_records` into `sponsorship_invoices`, which must preserve the
  Stripe identifiers the Checkout path already writes, including `stripe_invoice_id` and the
  `sponsor-billing:{id}` idempotency key convention.
- `sponsors.status` narrowing is a behavioural change to an existing public-facing read path
  (`getSponsorPlacement`, `lib/domain/sponsors.ts:11`) and requires an output-comparison check.
- Retiring `lib/domain/sponsor-billing.ts` touches a protected directory and is authorized only by
  this ADR and its Design Doc.

### Neutral Consequences

- Admin Sponsor Hub layout is unchanged by this decision; only its data source deepens.
- Public `/sponsors` copy is unaffected.

## Architecture Impact

Moves sponsor commercial truth from a pure in-memory module into the persistence layer, with
`lib/domain/sponsor-program.ts` retained as the folding and policy layer over persisted rows. This
matches the posture ADR 0002 established for event change receipts: SQL owns authorization and
storage, `lib/domain/` owns derivation, `app/` owns nothing but presentation.

New dependency direction: `lib/supabase/sponsor-program.ts` (new adapter) depends on
`lib/domain/sponsor-program.ts`. No dependency is introduced in the reverse direction, and no
Supabase client reaches `components/sponsor-hub.tsx`.

Adds an append-only table class to the project. `sponsor_payment_ledger_entries` is the first table
whose rows must never be updated or deleted in normal operation; this constraint is enforced by
policy rather than convention.

## Implementation Guidance

- **Fold, never store.** Paid, outstanding, refunded, and disputed totals are computed from the
  ledger on read. No balance column exists on any table.
- **Derive sponsor-facing status.** Extend `buildSponsorshipProgramSummary`; do not add a status
  column or an enum value anywhere to make a screen render.
- **Adopt, do not duplicate.** `sponsor_packages` is the package table. Do not create a second one.
- **Append-only means enforced at the table, not only in policy.** RLS is necessary but not
  sufficient: `createSupabaseAdminClient` uses the service role, which bypasses RLS entirely. The
  ledger therefore also carries a `before update or delete` trigger that raises, so append-only holds
  for every connection including service-role adapters.
- **Idempotency at the boundary.** `unique (provider, provider_event_id)` is the replay guard;
  the adapter treats a unique violation as success, matching `acknowledge_notification_receipt`
  behaviour described in ADR 0002.
- **Manual payment is a first-class provider.** `provider: "manual"` is not a fallback or a
  placeholder; it is how a league that has not enabled Stripe records a cheque.
- **Gate stays closed.** Nothing in this work changes the default of `loadPaymentGate`.

## Verification

- Migration applies and reads back on an isolated QA target under `EXT-HOSTED-SESSION`.
- `supabase/rls-policy.test.ts` gains literal policy-name assertions for all five new tables.
- An executed denial test proves an admin of organization A cannot read an agreement of
  organization B.
- An executed test proves `update` and `delete` on `sponsor_payment_ledger_entries` are rejected for
  every connection, including a service-role client, by the append-only trigger rather than by RLS
  alone.
- A duplicate `(provider, provider_event_id)` write leaves exactly one row and returns success.
- Output comparison: for every existing sponsor row, `getSponsorPlacement` returns an identical set
  before and after the `sponsors.status` narrowing.
- `npm run qa:sponsor-stripe-readiness` and `npm run qa:sponsor-fulfillment-readiness` pass with
  their source contracts updated to the new paths.
- `make validate`, `npm run build`, `npm run lint`.

## Related Information

- ADR 0001 — Human-In-The-Loop Agents. Renewal recommendations recommend; humans approve.
- ADR 0004 — Sponsor Portal Access Without A Fourth Role.
- ADR 0005 — Privacy-Safe Sponsor Placement Metrics.
- PRD: `docs/prd/sponsor-program-prd.md`.
- Design: `docs/design/sponsor-program-design.md`.
- Contradiction sources: `docs/production-task-board.md:38`, `docs/product-direction-2026-08.md:148`.
- Gates: `DEC-BILLING`, `EXT-HOSTED-SESSION`, `EXT-RLS-ACTOR-ACTION`.
