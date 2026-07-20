# User Scenario Verification - 2026-07-20

## Proof boundary

This run used an isolated local Supabase stack with migrations `0001` through `0023` and fictional QA identities. It proves the current checkout, local browser flows, database writes, and RLS behavior. It does not prove that migration `0023` is applied to the hosted Supabase project or that external providers delivered messages.

## Verified scenarios

| User | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| Signed-out visitor | Open parent home and RSVP routes | Private family records stayed behind the sign-in gate | `../parent-session-bound-signed-out.png`, `../parent-rsvp-session-bound-signed-out.png` |
| Parent | Open family home and schedule | Approved child/team scope, next event, RSVP state, and family logistics rendered from seeded rows | `verified-local/parent-mobile-390.png`, `verified-local/parent-schedule-mobile-390.png` |
| Parent | Save RSVP, claim snack and volunteer roles, update notification preference | Browser actions persisted and service-role readback matched the QA parent | `../parent-live-actions-qa-session-live.png` |
| Coach | Review next event, RSVP gaps, weather draft count, and Field Mode | Assigned-team scope and weather/readiness signals rendered | `verified-local/coach-mobile-390.png`, `verified-local/coach-schedule-mobile-390.png` |
| Coach | Save weekly update | Announcement plus pending notification draft persisted; no provider send executed | `../coach-weekly-update-qa-session-live.png` |
| Coach | Create Parent Replay | Early publish returned approval-required; approval then publication persisted with a pending notification draft | `../coach-parent-replay-private-write-live.png`, `verified-local/parent-replay-mobile-390.png` |
| Admin | Review launch blockers, operations, security, and provider-delivery record | Admin scope rendered and the provider review/audit rows persisted without claiming delivery | `verified-local/admin-desktop-1440.png`, `../provider-delivery-review-qa-session-live.png` |
| Parent, coach, anonymous | Query protected rows through Supabase clients | RLS boundary proof passed for all three clients | `npm run qa:rls-proof` console result |
| Parent, coach, admin | Render primary and schedule routes at 375, 390, 768, and 1440 pixels | Zero document-level horizontal overflow; wide coach matrix remains locally scrollable | Screenshots under `verified-local/` |

## Fixes produced by the run

- Volunteer claim authorization now derives organization scope through the signup's team.
- The QA harness follows the current sign-in redirect, checks visible role-scoped copy, opens compressed coach detail sections, and verifies the Parent Replay approval boundary.
- Coach/admin schedule previews contain wide tables and ICS text without widening the document.
- The operational-truth band separates summary, evidence count, and status copy.
