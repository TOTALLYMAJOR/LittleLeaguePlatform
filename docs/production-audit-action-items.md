# Production Audit Action Items

Audit date: 2026-06-25

## Verdict

The app is not ready for real-family production launch yet. The core scaffold, route coverage, authenticated mutation boundaries, Supabase-backed slices, deterministic AI Coach Workspace, and provider-safe draft flows are in place. The remaining work is mostly provider-delivery execution if approved, continued hosted proof after env rotation, and intentionally deferred product decisions.

## Validation Run

- `npm test` passed: 10 files, 131 tests.
- `npm run build` passed and generated 41 app routes.
- `npm run typecheck` initially failed against stale `.next/types` route definitions, then passed after `npm run build` regenerated the route types.
- `docker compose config --quiet` passed.
- Manual GitHub `Supabase QA proof` passed on 2026-06-28: https://github.com/TOTALLYMAJOR/LittleLeaguePlatform/actions/runs/28328007719 completed `npm run qa:rls-proof`, `npm run qa:session-proof`, `npm run qa:brand-proof`, and uploaded screenshot artifacts after QA migrations through `0019` were applied.
- Hosted production proof passed on 2026-07-01 against `https://www.leaguepilot.us` after correcting Vercel Production `NEXT_PUBLIC_SUPABASE_ANON_KEY` from a `service_role` JWT to an `anon` JWT and redeploying deployment `dpl_D8kTCkYhtrn6VA7VXrJAwM9kbYmf`.
- `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof` passed on 2026-07-01 after `npm run supabase:qa-users` refreshed the QA rows. It verified signed-out parent gates, signed-in parent and coach routes, parent RSVP/snack/volunteer/preference writes, Parent Replay publish rows, provider-delivery review rows, and signed-in admin `/admin/operations` plus `/admin/security` screenshots.
- Hosted route smoke on 2026-07-01 captured `/`, `/auth`, `/registration`, `/coach/parent-replay`, `/team-chat`, `/admin`, and `/offline` screenshots under `output/playwright/`.
- `npm run qa:rls-proof` passed locally on 2026-07-01 against the configured Supabase project.
- `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:brand-proof` passed on 2026-07-01 and captured `output/playwright/brand-launch-validation.png`.
- `npm run typecheck` now runs `next typegen && tsc --noEmit -p tsconfig.typecheck.json`; it passed on 2026-07-01 after `.next/types` was moved aside and regenerated.
- `npm test` passed on 2026-07-01: 18 files, 174 tests.
- `npm run build` passed on 2026-07-02 and generated 47 static pages with dynamic private routes. The known Next SWC lockfile warning still appears during Vercel deploy builds even after local lockfile repair attempts, but local `npm run typecheck` and `npm run build` pass.
- `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof` passed again on 2026-07-02 against deployment `dpl_ERncYiyZE3BXSz8TJHzKHsu7DPGZ`. The run added hosted browser proof that a signed-in QA coach saves a weekly update, Supabase persists the announcement plus pending `team_broadcast` notification draft, and no provider delivery attempt is created.
- Original audit worktree had only untracked local editor config; check current worktree state before release packaging.

## P0 Launch Blockers

1. Verify hosted Supabase environment secrets before production reliance.
   - Evidence: local and GitHub QA Supabase secrets are corrected and proven by the passing manual `Supabase QA proof` run. On 2026-07-01, Vercel Production was found with `NEXT_PUBLIC_SUPABASE_ANON_KEY` incorrectly set to a `service_role` JWT; it was corrected to an `anon` JWT, redeployed, and the hosted proof passed against `https://www.leaguepilot.us`.
   - Current status: covered for the currently configured production alias and Supabase project. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and separate from `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Repeat when: production Supabase project refs change, Vercel env values rotate, or a separate non-QA production Supabase project is introduced.

2. Preserve the manual Supabase QA workflow as release proof.
   - Evidence: `.github/workflows/supabase-qa-proof.yml` is scoped to the `qa` GitHub environment and passed on 2026-06-28 in workflow run https://github.com/TOTALLYMAJOR/LittleLeaguePlatform/actions/runs/28328007719.
   - Action: keep required `qa` environment secrets `QA_SUPABASE_URL`, `QA_SUPABASE_ANON_KEY`, `QA_SUPABASE_SERVICE_ROLE_KEY`, and `QA_SUPABASE_PROJECT_REF` current. Optional user override secrets remain `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_PARENT_EMAIL`, `QA_PARENT_PASSWORD`, `QA_COACH_EMAIL`, and `QA_COACH_PASSWORD`; otherwise the bootstrap step generates/appends QA credentials. The QA service-role key must be QA-only, not production.
   - Done when: met for the 2026-06-28 QA proof run; rerun after migrations, RLS changes, or secret rotation.

3. Make typecheck deterministic before CI/production reliance.
   - Evidence: `npm run typecheck` previously failed before build because stale `.next/types` referenced routes that no longer matched generated App Router types.
   - Current status: covered on 2026-07-01. `npm run typecheck` now runs `next typegen` before `tsc`, and it passed after `.next/types` was moved aside and regenerated.
   - Repeat when: Next.js route generation, `next-env.d.ts`, `tsconfig.typecheck.json`, or typed-route settings change.

4. Run hosted production smoke against the deployed URL, not only local build.
   - Evidence: hosted proof passed on 2026-07-01 against `https://www.leaguepilot.us`, covering `/`, `/auth`, `/registration`, `/parent`, `/parent/rsvp`, `/coach`, `/coach/parent-replay`, `/team-chat`, `/admin`, `/admin/operations`, `/admin/security`, and `/offline`.
   - Current status: covered for deployment `dpl_D8kTCkYhtrn6VA7VXrJAwM9kbYmf`.
   - Repeat when: production aliases, auth cookies, Supabase env values, role routing, or private route shells change.

## P1 Production Hardening

5. Provider sends are deferred from launch as draft/internal records only unless real email/SMS/Web Push delivery becomes explicit production scope.
   - Current truth: notification records, approval review, and delivery-attempt logs exist; external email/SMS/Web Push sends are intentionally disconnected.
   - Action if launching without sends: update launch copy/runbook to say notification drafts are internal only.
   - Action if launching with sends: implement send worker/adapters, recipient preference enforcement, unsubscribe UI, retry backoff, provider webhooks, and provider-send tests.

6. Finish notification provider execution if real alerts are required.
   - Current seams: `/api/provider-delivery/review`, `lib/supabase/provider-delivery.ts`, `lib/domain/notifications.ts`.
   - Action: connect Web Push VAPID execution and chosen email/SMS providers after approval, with suppression and retry evidence.
   - Done when: approved provider attempts create real sandbox sends and rejected attempts suppress sends with audit logs.

7. Add browser-level live action tests for key private writes.
   - Current truth: partially covered on 2026-07-02. Hosted QA browser proof now covers signed-out parent gates, signed-in parent/coach/admin read surfaces, parent RSVP save, snack claim, volunteer claim, notification preference save, coach weekly update draft, Parent Replay publish, and provider-delivery review against Supabase rows. New evidence screenshots include `output/playwright/parent-live-actions-qa-session-live.png`, `output/playwright/coach-weekly-update-qa-session-live.png`, `output/playwright/coach-parent-replay-private-write-live.png`, and `output/playwright/provider-delivery-review-qa-session-live.png`.
   - Remaining action: add Playwright proofs for media report/moderation, registration/admin approval flows, and team-builder/admin publish flows.
   - Done when: CI screenshots or traces prove every release-critical signed-in browser write uses real Supabase sessions.

8. Reconcile stale capability-matrix gaps.
   - Evidence: `docs/capability-matrix.md` still lists some gaps that later implementation covered, including team CRUD, division/season setup, coach assignment, roster lifecycle, tenant isolation, RSVP history UX, snack/volunteer reminders, caps, cancellation, and approval policies.
   - Action: update the matrix to separate current shipped truth from remaining hosted/provider proof.
   - Done when: `docs/capability-matrix.md`, `docs/Features.md`, and `docs/feature-fit-backlog.md` agree.

9. Confirm admin operations are production-scoped on hosted data.
   - Current seams: `/admin/operations`, `/admin/security`, `/admin/teams`, `/admin/guardian-links`, `/admin/archive`.
   - Action: run admin-path proof with a real org admin user and verify no cross-org rows appear.
   - Done when: admin proof screenshots and RLS checks cover every admin route.

10. Prove brand profiles across the 20 launch surfaces.
    - Current truth: `/admin/themes` now renders a 20-surface brand launch checklist, test-brand previews, metrics, monitoring events, alerts, coach feedback questions, and acceptance criteria. `team_brand_profiles`, validation runs, asset uploads, and brand monitoring events are modeled in Supabase with coach/admin RLS. `npm run qa:brand-proof` captures hosted browser proof for the checklist and monitoring contract.
    - Action: run `QA_PROOF_BASE_URL=<hosted-url> npm run qa:brand-proof`, then create several hosted test brands with distinct logo URLs, banner URLs, primary/secondary/accent/button colors, display names, short names, fallback avatars, and hero copy before browser-testing parent team switching, invite pages, email templates, and push identity.
    - Done when: all 20 surfaces pass hosted QA, non-coaches cannot edit branding, fallback email branding works, and brand monitoring alerts are wired to production telemetry.

11. Add rate limits and abuse controls to public intake endpoints.
    - Current public endpoints: `/api/registration-requests` and `/api/mobile-usage-events`.
    - Action: add server-side rate limiting or provider firewall rules for registration intake and anonymous usage events.
    - Done when: burst requests are rejected or throttled and the behavior is documented.

## P2 Product Decisions Before Wider Launch

12. Decide whether media uploads are in scope.
    - Current truth: media intake is link-based with Google Photos/YouTube validation, reporting, and moderation; upload storage provider is not configured.
    - Action if needed: add Supabase Storage or another private asset provider, upload review policy, file limits, scanning, and deletion/takedown workflow.

13. Sponsor billing proof foundation is now in scope.
    - Current truth: sponsor records, placements, logo metadata, audits, Stripe Product/Price lookup keys, invoice references, and payment-proof statuses are represented as admin-only readiness records.
    - Remaining action if live collection is required: connect server-side Stripe Product/Price/Invoice or Checkout flows with environment-managed restricted keys, webhook signature verification, and sandbox payment proof.
    - Boundary: sponsor billing proof remains separate from child-facing sponsor display and does not expose payment status to families.

14. Keep native Expo deferred unless PWA metrics prove need.
    - Current truth: PWA install and usage metrics exist; Expo readiness remains deferred.
    - Action: launch PWA first and use `mobile_usage_events` to decide whether app-store distribution, stronger native push, camera/media, or OS integration is justified.

15. Keep AI provider output review-only unless evaluated.
    - Current truth: AI Coach Workspace starts with deterministic drafts and has an authenticated `/api/coach/ai-workspace` OpenAI Responses API rewrite path for assigned coaches/admins only. Requests use signed-in Supabase coach scope, `store: false`, local privacy filters, approved media only, source evidence, and review-only output. Hosted proof passed with `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:ai-coach-proof`, capturing `output/playwright/ai-coach-provider-rewrite-qa-session-live.png`. Parent Replay publishing remains deterministic and coach-reviewed.
    - Remaining action: keep generated content draft/review-only until approval and audit gates are proven. Preview OpenAI env remains out of launch scope until a real non-production preview branch is chosen.

16. Automatic team building foundation is now in scope.
    - Current truth: roster maker readiness now includes balanced team-builder previews, sibling/guardian grouping, friend-request consideration, skill-balance scores, target roster warnings, Preview -> Edit -> Approve -> Publish workflow, and admin-only team-build plan tables.
    - Remaining action before real roster publication: wire persisted Supabase team-build plan saves, add birthdate/age-band and explicit player evaluation fields, and run browser-level admin publish proof.

## Hosting And Network Boundary

- Vercel Static IP is not part of the current launch path. The app should use Supabase HTTPS APIs with Supabase Auth, RLS, and server-only service-role boundaries.
- Do not enable Supabase Postgres/pooler IP allowlisting for the Vercel app unless a static egress path is deliberately added, such as Vercel Static IP, a controlled proxy, or another fixed-egress deployment path.
- Direct database migration/proof commands should run from controlled local or CI environments using QA/prod-specific credentials, not from client-visible app code.

## Evidence To Preserve

- Keep `npm test`, `npm run build`, and final `npm run typecheck` outputs in release notes.
- Keep Supabase QA proof screenshots under `output/playwright/` as CI artifacts, not source-controlled files; preserve the passing 2026-06-28 workflow URL in release notes.
- Keep provider-send proof separate from notification-record proof: queued records are not sent messages.
- Keep AI Coach Workspace wording clear: deterministic draft generation is the default, OpenAI rewrites are provider-backed only through `/api/coach/ai-workspace`, and neither path publishes or sends automatically.
