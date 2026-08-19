# ADR 0002 - Server-Side Event Change Receipts

## Status

Accepted

Accepted 2026-08-19. Option C is approved: use a per-change receipt table and derive the
acknowledgment requirement from the existing change type.

## Context

Schedule-change awareness for families is currently device-local. `components/family/change-band.tsx`
stores a "last seen" watermark in `window.localStorage` under a key composed of parent, organization,
season, and child context (`components/parent-weekly-dashboard.tsx:270-276`). The watermark advances
inside a `useEffect` on render.

Three consequences follow, and all three are product problems rather than cosmetic ones:

1. The watermark does not cross devices. A guardian who reads changes on a phone is shown the same
   changes again on a laptop.
2. The watermark advances on render, not on a human action. A change is recorded as seen whether or
   not anyone read it.
3. No server-side record exists that a family saw a start-time, venue, or cancellation change. For
   exactly the changes that carry safety consequence, the organization can prove nothing.

The repository already contains a server-side acknowledgment pattern for official communications:
`acknowledged_at` on `public.notification_delivery_attempts` (`0023_operational_truth_hardening.sql:141`),
an authorization-bearing `public.acknowledge_notification_receipt` RPC
(`0024_coordination_loops.sql:854`, revised in `0030_official_communication_revisions.sql:557`),
a service wrapper in `lib/supabase/notification-receipts.ts:431`, and a route at
`app/api/notifications/acknowledge/route.ts`.

`public.parent_replay_engagement` (`0023_operational_truth_hardening.sql:113-124`) provides the
per-parent engagement-record shape: `viewed_at`, `acknowledged_at`, and a
`unique (parent_replay_id, parent_user_id)` constraint.

This decision is required because it changes where family awareness state is stored — browser memory
to Postgres — which is a data-flow storage-location change under the project documentation criteria.

## Decision

Family awareness of an event change becomes server-side state, recorded per guardian per change log
entry, using the engagement-record pattern already established by `parent_replay_engagement` and the
SQL-authorized RPC pattern already established by `acknowledge_notification_receipt`.

### Decision Details

- A new table `public.event_change_receipts` records `seen_at` and `acknowledged_at` per
  `(event_change_log_id, parent_user_id)`.
- Authorization lives in SQL, in a `security definer` RPC with `set search_path = public`, execution
  revoked from `public, anon` and granted to `authenticated, service_role`, consistent with
  `20260726143938_restrict_rls_helper_execution.sql`.
- Whether a change requires explicit acknowledgment is **derived** from the existing
  `event_change_logs.change_type` check constraint, not stored. `time_changed`, `location_changed`,
  and `cancelled` are high-impact; `created`, `completed`, and `restored` are informational. No new
  enum value and no new workflow state is introduced.
- `localStorage` is removed as the source of truth. It may remain only as an offline-tolerant
  optimistic hint, never as the record.

## Rationale

The alternative options were evaluated against the constraint that this product's differentiator is
provable coordination truth, and that incumbents already notify well but do not prove receipt.

### Options Considered

| Option | Cross-device | Provable receipt | Distinguishes read from acknowledged | New schema | Reuses existing pattern |
| --- | --- | --- | --- | --- | --- |
| A. Keep `localStorage` watermark | No | No | No | None | n/a |
| B. Server watermark column on an existing profile/membership row | Yes | Partially — one timestamp for all changes | No | Small | No |
| C. Per-change receipt table plus derived acknowledgment requirement (**chosen**) | Yes | Yes, per change | Yes | One table, one RPC | Yes — `parent_replay_engagement` and `acknowledge_notification_receipt` |
| D. Reuse `notification_delivery_attempts.acknowledged_at` directly | Yes | Only when a notification exists | Yes | None | Yes |

Option A is the status quo and fails all three problems in Context.

Option B is the cheapest server-side fix, but a single high-water timestamp cannot express "this
family saw the venue change but has not acknowledged the cancellation." It also silently discards
history the moment a newer change arrives, which is the failure mode that makes the current
implementation untrustworthy.

Option D is attractive because it adds no schema, but it couples awareness to delivery. Provider
sends are gated behind `DEC-PROVIDER` and `EXT-PROVIDER-SENDS`, so under Option D no receipt could
exist until those gates open, and in-app-only families would never be represented. Awareness must be
independent of delivery.

Option C is chosen because it is the only option that records per-change truth, works before
provider sends are enabled, and reuses two patterns already proven in this repository rather than
inventing a third.

### Positive Consequences

- A guardian's awareness state follows the guardian, not the browser.
- The organization gains defensible evidence for high-impact changes, which is the trust asset this
  product sells to league boards.
- Acknowledgment becomes a deliberate human action, consistent with ADR 0001.
- The receipt record is a natural join target when `EXT-PROVIDER-SENDS` opens, without rework.

### Negative Consequences

- One additional table and one additional RPC to maintain, plus RLS policies and denial tests.
- A write on a previously read-only family surface, which requires rate-limit and idempotency
  consideration.
- Receipt rows grow with changes multiplied by guardians; retention policy must be stated rather
  than assumed.

### Neutral Consequences

- The visual design of the change band is unaffected; only its state source changes.
- Offline behavior is unchanged if `localStorage` is retained as an optimistic hint.

## Architecture Impact

Adds a write path to the family surface, which until now performed scoped reads only. The write is
authorized in SQL rather than in the route, which moves this surface toward the RLS-primary posture
that `EXT-RLS-ACTOR-ACTION` requires, rather than deeper into service-role bypass.

## Implementation Guidance

- Authorize in SQL. The route resolves the session actor and passes it; it does not decide scope.
- Derive acknowledgment requirement from `change_type`. Do not add a status column.
- Make the acknowledgment write idempotent — repeated acknowledgment of the same change is a no-op
  returning the original timestamp, matching `acknowledge_notification_receipt` behavior.
- Do not let a failed receipt write break the read surface. Awareness display degrades to
  "unconfirmed" rather than erroring.

## Verification

- Migration applies and reads back on an isolated QA target under `EXT-HOSTED-SESSION`.
- `supabase/rls-policy.test.ts` gains literal policy-name assertions for the new table.
- A guardian cannot write a receipt for a change on a child they are not linked to, proven by an
  executed denial test rather than by policy existence.
- A second acknowledgment of the same change returns the first timestamp and creates no second row.
- The change band renders identical content for the same guardian on two different devices.

## Related Information

- ADR 0001 — Human-In-The-Loop Agents (acknowledgment is a human action).
- Design: `docs/design/event-change-acknowledgment-design.md`.
- Gates: `EXT-RLS-ACTOR-ACTION`, `EXT-HOSTED-SESSION` in `docs/backlog-closeout-2026-07-27.md`.
