---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-25
---
# LP-UX-018 Server Event-Change Receipts Acceptance

Date: 2026-08-19 (US/Central)

## Verdict

LP-UX-018 is implemented, merged to `origin/main`, and production-migrated. It replaces the Family Home change band's device-local watermark with one server-authoritative receipt per guardian and event change.

This establishes local source, test, transactional PostgreSQL, responsive/browser evidence, and protected production migration readback. It is not a real signed-in production acknowledgment journey, a human usability signoff, or a blanket claim that every production family scenario has been accepted.

## Implemented boundary

- Migration `20260819084447_event_change_receipts.sql` adds `event_change_receipts`, RLS, explicit Data API grants, and the `security definer` `acknowledge_event_change` RPC.
- The RPC binds the authenticated actor, re-derives organization/event/player/active-guardian scope in SQL, accepts only `seen` or `acknowledged`, and derives high-impact acknowledgment eligibility from `time_changed`, `location_changed`, or `cancelled`.
- The unique receipt key plus conflict-safe row locking preserves the original timestamps under repeats and concurrency. Acknowledgment implies seen, and only the first acknowledgment writes its audit event.
- Parent event-change reads add exactly one bounded receipt query. A failed receipt query retains the scoped changes but labels their receipt state unconfirmed and exposes no acknowledgment control.
- `POST /api/parent/event-changes/acknowledge` validates input, derives the parent from `requireAuthenticatedRouteUser`, and maps SQL denial to 403.
- `ChangeBand` contains no Supabase client or localStorage authority. Informational changes record seen when online; time/location/cancellation changes remain unresolved until explicit button activation. Offline and failed writes never render optimistic success.
- No `lib/domain` type, event state, change-log writer, attendance/RSVP state, provider send, or staff workflow changed.

## Local evidence

- A transactional PostgreSQL proof against the exact local Supabase database passed linked seen, first acknowledgment, repeat acknowledgment with the original timestamp, unrelated-child denial with zero receipt rows, actor-spoof denial, and exactly one audit record; fixture rows were rolled back.
- Focused typecheck and 55 tests pass across migration policy assertions, receipt service/read behavior, authenticated API mapping, and Family UI behavior.
- `npm run qa:event-change-receipts-proof` records 20 passing production-component scenarios in `output/playwright/lp-ux-018-event-change-receipts/proof.json`: 320, 390, 768, 1024, and 1440 pixels across Family Light, device Light, device Dark, and forced colors.
- Each browser scenario proves zero acknowledgments before activation, exactly one after activation, immediate acknowledged rendering, no horizontal overflow, no control below 44px, visible keyboard focus, and zero serious/critical axe findings. Separate 390px cases prove retry and offline fail-closed behavior while retaining the change.
- The browser pass found and corrected a real device-Dark contrast defect caused by the root changed-status background token remaining light.

## Production promotion evidence

- The protected production Supabase target dry-run planned exactly one pending migration: `20260819084447_event_change_receipts.sql`.
- The reviewed migration then applied to production without seed data, and the guarded follow-up plan returned "Remote database is up to date."
- The implementation line was merged to `origin/main` at `37cbfea`.
- Production schema promotion does not itself prove a real signed-in production parent acknowledged a live change; that action remains a separate acceptance step because it writes production data.

## Remaining gates

- Read-only production route and scoped-read verification may still be run as a separate non-mutating acceptance pass.
- A real signed-in production acknowledgment click and readback still require explicit authorization because they mutate production data.
- Human acceptance remains separate from schema promotion, merge, and automated smoke/build evidence.
