# Production Audit Action Items

Audit date: 2026-06-25

## Verdict

The app is not ready for real-family production launch yet. The core scaffold, route coverage, authenticated mutation boundaries, Supabase-backed slices, deterministic AI Coach Workspace, and provider-safe draft flows are in place. The remaining work is mostly hosted proof, secret/config correctness, provider-delivery execution, live browser proof, and a few intentionally deferred product decisions.

## Validation Run

- `npm test` passed: 10 files, 128 tests.
- `npm run build` passed and generated 41 app routes.
- `npm run typecheck` initially failed against stale `.next/types` route definitions, then passed after `npm run build` regenerated the route types.
- `docker compose config --quiet` passed.
- `git status` is clean except for untracked local editor config: `.vscode/`.

## P0 Launch Blockers

1. Fix Supabase QA and hosted environment secrets.
   - Evidence: `docs/build-progress.md` still records that local `.env.local` used a service-role JWT for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `qa:rls-proof` correctly refuses that.
   - Action: set a real Supabase anon key in local, Vercel/hosted env, and GitHub Actions secrets; keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
   - Done when: `npm run supabase:qa-users`, `npm run qa:rls-proof`, and `npm run qa:session-proof` pass against the intended QA Supabase project.

2. Prove the manual Supabase QA workflow in GitHub.
   - Evidence: `.github/workflows/supabase-qa-proof.yml` exists but depends on QA secrets.
   - Action: add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `QA_PARENT_EMAIL`, `QA_PARENT_PASSWORD`, `QA_COACH_EMAIL`, and `QA_COACH_PASSWORD` secrets.
   - Done when: the manual `Supabase QA proof` workflow passes and uploads parent/coach proof screenshots.

3. Make typecheck deterministic before CI/production reliance.
   - Evidence: `npm run typecheck` failed before build because stale `.next/types` referenced routes that no longer matched generated App Router types; it passed after `npm run build`.
   - Action: choose one policy: clean `.next` before standalone typecheck, generate route types before typecheck, or remove stale generated route types from the typecheck path.
   - Done when: a clean checkout and a dirty local checkout both pass `npm run typecheck` without needing manual build-order knowledge.

4. Run hosted production smoke against the deployed URL, not only local build.
   - Evidence: local `npm run build` passes, but production proof still needs the real host, env, cookies, auth redirect, and Supabase project.
   - Action: test `/`, `/auth`, `/registration`, `/parent`, `/parent/rsvp`, `/coach`, `/coach/parent-replay`, `/team-chat`, `/admin`, `/admin/security`, and `/offline` on the hosted domain.
   - Done when: signed-out, parent, coach, and admin flows have screenshots or CI artifacts from the hosted URL.

## P1 Production Hardening

5. Decide whether provider sends remain deferred or become production scope.
   - Current truth: notification records, approval review, and delivery-attempt logs exist; external email/SMS/Web Push sends are intentionally disconnected.
   - Action if launching without sends: update launch copy/runbook to say notification drafts are internal only.
   - Action if launching with sends: implement send worker/adapters, recipient preference enforcement, unsubscribe UI, retry backoff, provider webhooks, and provider-send tests.

6. Finish notification provider execution if real alerts are required.
   - Current seams: `/api/provider-delivery/review`, `lib/supabase/provider-delivery.ts`, `lib/domain/notifications.ts`.
   - Action: connect Web Push VAPID execution and chosen email/SMS providers after approval, with suppression and retry evidence.
   - Done when: approved provider attempts create real sandbox sends and rejected attempts suppress sends with audit logs.

7. Add browser-level live action tests for key private writes.
   - Current truth: route-level tests verify session-derived actor IDs; QA browser proof covers signed-in read surfaces.
   - Action: add Playwright proofs for RSVP save, snack claim, volunteer claim, weekly update draft, Parent Replay publish, media report/moderation, and provider-delivery review.
   - Done when: CI screenshots or traces prove signed-in browser writes use real Supabase sessions.

8. Reconcile stale capability-matrix gaps.
   - Evidence: `docs/capability-matrix.md` still lists some gaps that later implementation covered, including team CRUD, division/season setup, coach assignment, roster lifecycle, tenant isolation, RSVP history UX, snack/volunteer reminders, caps, cancellation, and approval policies.
   - Action: update the matrix to separate current shipped truth from remaining hosted/provider proof.
   - Done when: `docs/capability-matrix.md`, `docs/Features.md`, and `docs/feature-fit-backlog.md` agree.

9. Confirm admin operations are production-scoped on hosted data.
   - Current seams: `/admin/operations`, `/admin/security`, `/admin/teams`, `/admin/guardian-links`, `/admin/archive`.
   - Action: run admin-path proof with a real org admin user and verify no cross-org rows appear.
   - Done when: admin proof screenshots and RLS checks cover every admin route.

10. Add rate limits and abuse controls to public intake endpoints.
    - Current public endpoints: `/api/registration-requests` and `/api/mobile-usage-events`.
    - Action: add server-side rate limiting or provider firewall rules for registration intake and anonymous usage events.
    - Done when: burst requests are rejected or throttled and the behavior is documented.

## P2 Product Decisions Before Wider Launch

11. Decide whether media uploads are in scope.
    - Current truth: media intake is link-based with Google Photos/YouTube validation, reporting, and moderation; upload storage provider is not configured.
    - Action if needed: add Supabase Storage or another private asset provider, upload review policy, file limits, scanning, and deletion/takedown workflow.

12. Sponsor billing proof foundation is now in scope.
    - Current truth: sponsor records, placements, logo metadata, audits, Stripe Product/Price lookup keys, invoice references, and payment-proof statuses are represented as admin-only readiness records.
    - Remaining action if live collection is required: connect server-side Stripe Product/Price/Invoice or Checkout flows with environment-managed restricted keys, webhook signature verification, and sandbox payment proof.
    - Boundary: sponsor billing proof remains separate from child-facing sponsor display and does not expose payment status to families.

13. Keep native Expo deferred unless PWA metrics prove need.
    - Current truth: PWA install and usage metrics exist; Expo readiness remains deferred.
    - Action: launch PWA first and use `mobile_usage_events` to decide whether app-store distribution, stronger native push, camera/media, or OS integration is justified.

14. Keep AI provider disconnected unless evaluated.
    - Current truth: AI Coach Workspace and Parent Replay are deterministic, review-only draft tools.
    - Action if adding an AI provider: add prompt/eval harness, hallucination tests, privacy filters, source citations, provider usage controls, and review gates before any generated content is publishable.

15. Automatic team building foundation is now in scope.
    - Current truth: roster maker readiness now includes balanced team-builder previews, sibling/guardian grouping, friend-request consideration, skill-balance scores, target roster warnings, Preview -> Edit -> Approve -> Publish workflow, and admin-only team-build plan tables.
    - Remaining action before real roster publication: wire persisted Supabase team-build plan saves, add birthdate/age-band and explicit player evaluation fields, and run browser-level admin publish proof.

## Evidence To Preserve

- Keep `npm test`, `npm run build`, and final `npm run typecheck` outputs in release notes.
- Keep Supabase QA proof screenshots under `output/playwright/` as CI artifacts, not source-controlled files.
- Keep provider-send proof separate from notification-record proof: queued records are not sent messages.
- Keep AI Coach Workspace wording clear: deterministic draft generation is not an AI-provider integration.
