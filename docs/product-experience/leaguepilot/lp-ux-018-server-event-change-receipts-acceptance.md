# LP-UX-018 Server Event-Change Receipts Acceptance

Date: 2026-08-19 (US/Central)

## Verdict

LP-UX-018 is implemented and locally database/browser verified in the current dirty checkout. It replaces the Family Home change band's device-local watermark with one server-authoritative receipt per guardian and event change.

This is local source, test, transactional PostgreSQL, and isolated production-component browser evidence. It is not a commit, publication, deployment, hosted migration readback, hosted signed-in journey, production-data acceptance, or human usability acceptance.

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

## Remaining gates

- Apply and read back migration `20260819084447` on an explicitly approved isolated QA target.
- Run `npm run qa:rls-proof` there with real parent sessions, including unrelated-child denial and service-role zero-row readback.
- Prove the same receipt state in two authenticated browser sessions/devices against that hosted target.
- Deployment, production migration, production-data behavior, monitoring, and human acceptance require separate authorization and evidence.
