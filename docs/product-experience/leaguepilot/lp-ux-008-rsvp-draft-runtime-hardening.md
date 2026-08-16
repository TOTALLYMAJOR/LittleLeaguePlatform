# LP-UX-008 RSVP Draft Runtime Hardening

Date: 2026-08-03

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Continuation: hardens the pending coach RSVP reminder-draft path introduced by LP-UX-007. This is local runtime and test evidence only; it does not change notification workflow states, send a provider message, add a migration, deploy, or claim hosted acceptance. `10-reference-implementation-brief.md` remains untouched.

## Production Boundary

- **Tenant context:** organization is derived from the coach-authorized team; event and active guardian/player links must resolve inside that exact team.
- **Tenant isolation:** the verified session actor is checked by `requireActiveTeamCoachOrOrgAdmin`; event and guardian queries are team-bounded; cross-team event/family failures use one non-enumerating response.
- **Actor authorization:** the route accepts no client actor identity. `actorUserId` is always the authenticated session user and the adapter requires an active assigned coach or organization admin.
- **Lifecycle/state:** the only persisted notification state remains existing `pending`; duplicate drafts are reused and no new status or enum was introduced.
- **Configuration:** behavior is global application logic over the selected team and existing provider-review queue. No environment, organization, team, or provider switch changed.
- **Audit/observability:** created drafts write `rsvp_reminder_draft_created`; duplicate reuse writes `rsvp_reminder_draft_reused`. Audit failure is no longer ignored.
- **Failure/idempotency:** malformed identifiers fail before Supabase; scope-read, RSVP-read, duplicate-check, and insert failures return `503`; fully responded families return `409`; duplicate pending drafts return `200`; newly created drafts return `201`. If the draft persists but its audit receipt fails, the response is an explicit `503 audit_unavailable` with `draftPersisted: true`, enabling a safe retry to reuse the draft and reattempt an audit receipt.
- **Security threat check:** strict scalar identifier parsing blocks object/array coercion and oversized identifiers; verified session identity blocks actor spoofing; bounded team/event/family queries address IDOR and tenant spoofing; no contact data is returned; no provider attempt is created; duplicate checks prevent ordinary replay duplication.

## Applied Changes

1. Added a typed RSVP reminder result contract with explicit `created`, `duplicate`, `invalid_input`, `forbidden`, `scope_mismatch`, `already_responded`, `unavailable`, and `audit_unavailable` outcomes.
2. Added strict request validation for team, event, and linked-family identifiers before the service boundary.
3. Added HTTP semantics for created (`201`), reused (`200`), forbidden (`403`), scope mismatch (`404`), already responded (`409`), and persistence/audit unavailability (`503`).
4. Replaced event-versus-family scope detail with one privacy-safe cross-scope response.
5. Made audit inserts observable. A persisted draft is never reported as fully successful when its audit receipt fails.
6. Added duplicate-reuse audit evidence without creating another notification or any provider delivery attempt.
7. Added direct adapter tests for authorization, tenant scope, RSVP state, duplicate reuse, pending-only persistence, zero provider attempts, persistence failure, audit partial failure, grouped draft privacy, and degraded reads.
8. Expanded route tests for malformed input, session-derived actor identity, and every response-status class.
9. Replaced the theme toggle's mount-time state effect with an external-store subscription so explicit light/dark changes remain synchronized without violating the React hooks lint gate.
10. Closed browser-found accessibility gaps in shared navigation: public-brand links now retain a 44px target, breadcrumb links retain a 32px target, and attention badges use a darker red with 4.85:1 white-text contrast.
11. Expanded manual-theme axe diagnostics to retain failing selectors, markup, and remediation summaries when a browser gate fails.

## Verification

- Focused Vitest: `app/api-live-actions.test.ts`, `lib/supabase/coach-rsvp-reminders.test.ts`, and `lib/supabase/coach-drafts.test.ts` — 3 files, 49 tests passed.
- Focused shell/UI Vitest after the browser remediations: `components/ui/primitives.test.tsx`, `components/ui/AppShell.test.tsx`, and `app/routes-smoke.test.ts` — 3 files, 33 tests passed.
- Full Vitest: 117 files, 698 tests passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed with 0 errors; 16 existing warnings remain outside this bounded slice.
- `npm audit --omit=dev` — 0 vulnerabilities.
- `npm run build` — passed; 104 static pages generated and standalone assets assembled by `postbuild`.
- `git diff --check` — passed.
- Local production-build browser proof: `npm run qa:manual-theme-proof` passed all 32 results at `http://127.0.0.1:3123`. The matrix covered default-light behavior even with a dark-preferring device, explicit dark persistence, every Family route at 390px and 1440px, and signed-in parent/coach/admin states with no serious/critical axe violations, unexpected light panels, document overflow, or page errors. Evidence: `output/playwright/lp-ux-008-runtime-hardening/theme-regression/proof.json` and its screenshots.

## Explicitly Deferred

1. The database uniqueness constraint for simultaneous identical reminder-draft requests remains deferred pending explicit schema approval. The tested pre-insert duplicate check prevents ordinary retries but cannot prove cross-instance race exclusion.
2. Hosted Supabase readback, hosted signed-in browser proof, deployment, and production acceptance remain external gates.
3. Provider approval, provider delivery attempts, email/SMS/push sends, and delivery readback were not enabled or executed.
4. `10-reference-implementation-brief.md` was not touched.
5. The 16 non-blocking lint warnings were recorded rather than silently expanding this slice; they include existing feature-panel dependency/image warnings, a shared primitive ARIA warning, two protected domain-file warnings, and one proof-script warning.
