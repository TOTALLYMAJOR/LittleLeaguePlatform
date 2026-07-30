# 05 — Saturday Ready: Current-State Trace

Read-only audit, 2026-07-29. The north-star candidate workflow:

Family Home → What Changed → Next Event → RSVP → Transportation → Official Team Update → Family Readiness Confirmed

Naming note of record: "Saturday Ready" appears in the repo only as a historical IA name (`docs/build-progress.md`, 2026-07-03); the governing blueprint expresses the same intent as the "seven questions in five seconds" contract and the six-stage family cycle (stage 4 "Coordinate the week", stage 5 "Handle change"). This document traces the workflow against shipped code, per step.

**Verdict up front: the workflow is completable today, end to end, on one route (`/parent`) plus one hop (`/parent/transportation`), with authoritative persistence at every mutating step — except that (a) "What Changed" is version-derived rather than diff-backed, (b) "Family Readiness Confirmed" is a derived display state, not a persisted family confirmation, and (c) delivery of the official update to a family device is draft/review-gated by design (no provider sends).**

## Step-by-step trace

### Step 1 — Family Home

| Field | Current state |
| --- | --- |
| Route | `/parent` (`app/parent/page.tsx` → `ParentHomeSurface`, `app/parent/_surfaces.tsx:41`) |
| User question | "What is happening with my family this week?" |
| Authoritative data | 5 parallel server reads: dashboard state, notification receipts, family handoffs, transportation responsibilities, family replays — composed by `buildFamilyMissionControl` (`lib/family-mission-control.ts`) |
| Permission | `requireParentPageAccess()` — signed-in + active guardian link; fails to explicit `signed_out` / `missing_parent_link` states with empty (never seed) data |
| Primary action | Inline RSVP on Next Up card (3-button Going/Maybe/Can't go) |
| State clarity | Confirmed/need-reply chips; per-event "Needs reply"; write buttons disabled unless `isSupabaseBacked && accessStatus === "live"` and season not archived |
| Mobile | Bottom tab bar; 3,151px page height at 390px (long but front-loaded: What Changed and Next Up are in the first two viewports) |
| Failure/recovery | Offline → RSVP refused with copy directing to RSVP center; access-denied → gate surface |
| Gaps | No child switcher (`children[0]` drives the header); "Detailed family operations" disclosure duplicates four other pages; no `loading.tsx`/`error.tsx` |

### Step 2 — What Changed

| Field | Current state |
| --- | --- |
| Route | Band at top of `/parent` ("SINCE YOU LAST CHECKED / What changed") |
| User question | "What changed since I last checked?" |
| Authoritative data | **Partially.** Banner text is derived: `family-mission-control.ts:194` renders "…is now schedule version N. Review current details." from `events.schedule_version > 1`. The real evidence — `event_change_logs` with `change_type`, `before_json`/`after_json`, reason, actor (`lib/supabase/schedule-management.ts:663-722`) — is **written on every schedule save but read by no parent surface** |
| Classification | LIVE BUT INCOMPLETE. The change *record* is authoritative; the parent *presentation* of it is a version-number heuristic with no field-level diff ("was 6:00 PM at Field 2, now 5:30 PM at Field 1"), no "since last checked" watermark, and no per-guardian reviewed state |
| Recovery | None needed — read-only |
| Note | Official disruptions are interlocked: an `official_disruption` message cannot publish unless an attributed change log exists at that exact schedule version (`0030:303-318`). The evidence chain exists; only the family-facing diff is missing |

### Step 3 — Next Event

| Field | Current state |
| --- | --- |
| Route | "Next Up" hero card on `/parent`; fuller passport under the buried disclosure (`EventPassport` component variants: full/compact/offline/caregiver); event context also on `/parent/schedule` |
| User question | "When, where, which child, what do we bring, who drives?" |
| Authoritative data | `events` row with `schedule_version`; venue; snack duty chip; ride-plan chip ("Ride plan not set · coordinate") from transportation responsibilities |
| State clarity | Good: date/time/location/child; "Needs reply" flag; snack + ride chips |
| Gaps | Blueprint §7.8 wants leave-time and bring-list in the passport (leave time not computed); offline pack shows "not confirmed on this device" |

### Step 4 — RSVP

| Field | Current state |
| --- | --- |
| Route | Inline on `/parent` (primary) and `/parent/rsvp` (secondary, different 4-button grammar) |
| User question | "Will Avery be there?" |
| Permission | `requireActiveParentForPlayerEvent` — active guardian link AND player.team = event.team (`lib/supabase/access-control.ts:206`); executed denial tests exist |
| Persistence | **LIVE AND AUTHORITATIVE.** `save_parent_rsvp_with_versions` RPC: unique row per (event, child); requires `Idempotency-Key`, `expectedLockVersion`, `expectedScheduleVersion`; SELECT FOR UPDATE; stamps `confirmed_schedule_version`; writes `rsvp_change_logs` + idempotent `offline_action_receipts` (`0023:415-490`) |
| State transition | no_response → going/maybe/not_going; stale RSVP suppressed in UI when `confirmedScheduleVersion < event.scheduleVersion` |
| Failure states | 409 `schedule_changed` (distinct copy), 409 `guardian_conflict` (another guardian answered), `offline_disabled` when org gate off |
| Success evidence | Optimistic UI + `role="status" aria-live="polite"` confirmation; RSVP coverage meter on Home |
| Notification | None generated by an RSVP (correct — family-internal) |
| Gap | Two interaction grammars (Home 3-button vs RSVP-page 4-button with Cancel); RSVP-page lacks 409 conflict copy |

### Step 5 — Transportation

| Field | Current state |
| --- | --- |
| Route | `/parent/transportation` (hop away from Home; Home shows only the "Ride plan not set" chip) |
| User question | "Who is getting this child there and home?" |
| Permission + persistence | **LIVE AND AUTHORITATIVE — strongest slice in the repo.** Five `security definer` RPCs (`0028_transportation_responsibility.sql`): request (open, per event+child+direction, pickup restrictions fail closed), offer (requester ≠ offerer, version must match), accept (only requesting guardian; both links re-verified; version re-checked twice; sibling offers auto-withdrawn; DB CHECK forbids `assigned` without both acceptances), withdraw both sides with reasons |
| State vocabulary | unassigned / awaiting_requester_acceptance / assigned / withdrawn / needs_review (`schedule_changed` derived when request.schedule_version ≠ event.schedule_version) — matches the brief's requested/offered/accepted/expired/withdrawn/invalidated set, with "expired" folded into event-in-past checks |
| Handoff | Event Passport reflects "Not assigned" until mutual acceptance exists (fail-closed, verified in UI at `family-transportation.tsx:253`) |
| Mobile | Workflow is desktop-grid today; 2,823px tall at 390px; two-party confirm checkboxes are small targets |
| Gap | Not reachable as a workflow from the Next Up card (chip is display-only on Home); no invalidation *notification* — a guardian discovers `needs_review` only by visiting |

### Step 6 — Official Team Update

| Field | Current state |
| --- | --- |
| Route | `/parent/messages` (Communication Room), Critical + Updates lanes; also Coach Updates card on Home |
| Permission | Publish: in-SQL coach-or-admin; critical requires admin (`0030:259-276`). Read: recipient-scoped receipts |
| Persistence | **LIVE AND AUTHORITATIVE.** Append-only versions with content hash; corrections/withdrawals are new versions; fan-out creates per-guardian `notifications` + projections across 5 surfaces |
| Acknowledgement | Per-guardian, row-locked, idempotent RPC; blocked if superseded (`superseded`), if no delivery attempt (`attempt_required`), or wrong-version evidence; audited. UI explains "receipt only" semantics — receipt never implies attendance/agreement (decided contract) |
| Delivery | **Draft/review-gated by design.** Provider sends require env kill switch + org flag + QA allowlist (or production approval flags); as configured, nothing sends. UI must (and largely does) show "No provider send occurred" truthfully |
| Gap | Meta-explanation density in the Room ("What acknowledgement means", "Human authority" panels consume the right rail); Home's Coach Updates card doesn't carry ack state |

### Step 7 — Family Readiness Confirmed

| Field | Current state |
| --- | --- |
| Route | "Family Readiness / This season at home" card on `/parent` (RSVP coverage, Family help, Published Replays meters) |
| Authoritative data | **Derived, not persisted.** Meters compute from live rows (RSVP coverage "2 of 4 answered", assignment counts). There is no per-event, per-family "ready" record, no departure-threshold evaluation, and no blueprint §12 readiness-rule engine (FAM-RSVP-001, FAM-RIDE-001, FAM-CRIT-001 are documented intent) |
| Classification | DOCUMENTED INTENT (blueprint §12/§16 "Family readiness before departure" metric) with a LIVE partial display |
| Honesty check | The card correctly avoids claiming "ready" — it shows coverage counts. Any target design must keep readiness as a *derived aggregation of independent evidence lanes*, never a stored boolean that can go stale |

## Can the workflow be completed today?

Yes, with qualifications:

1. A signed-in guardian can, in one session on live data: see the week → see a change banner → open Next Up → RSVP with version binding → visit Transportation and complete request/offer/mutual-accept (two guardians required) → read and acknowledge an official update → watch the readiness meters move. Every mutation persists through authorized, idempotent, version-checked RPCs.
2. "What Changed" is honest but shallow (version number, not diff) — the highest-leverage data seam already exists (`event_change_logs`).
3. "Family Readiness Confirmed" is a display aggregate; presenting it as a confirmation would violate the repo's own operational-truth rules. Target state must phrase it as "Nothing unresolved for Saturday" (evidence-lane aggregation), not "Family confirmed ready."
4. Transportation invalidation on schedule change is fail-closed at mutation time but silent at notification time.
5. No provider delivery: "official update received on phone" is out of scope until EXT-PROVIDER-SENDS/DEC-PROVIDER close. In-app receipt lanes are the current truth.

## Workflow-adjacent authorization gaps found during trace (report-only; no fixes applied)

These are engineering findings surfaced to the maintainers; they are not UX work but sit on parent-facing routes:

1. `app/api/schedule/export/route.ts` — ICS export authenticates but never checks team/org membership, over an unfiltered cross-org `events` read (`schedule-management.ts:269-283`). Cross-tenant calendar disclosure to any authenticated user with a team UUID.
2. `lib/supabase/team-chat.ts:617` — read-receipt write path has no team-membership check; any authenticated user can mutate `read_by_user_ids` on arbitrary messages (drives unread badges).
3. `lib/supabase/operations.ts:1545` — weather-alert draft creation has no coach/admin authorization; any authenticated user can create drafts on any event and trigger third-party weather API calls.
4. `player_media_consents` has no application writer — family media release and replay family media are unreachable end to end (blocks the Photos surface's real family value).
5. `team_chat_messages.retained_until` never populated — season-close chat retention purge is a permanent no-op (privacy commitment "chat text is deleted after season close" is currently unenforceable).
6. RLS is defense-in-depth only (service-role client everywhere); correct policies exist that would have blocked items 1–3 but are bypassed. Executed 403-denial tests are thin (4 repo-wide).
