# Production Audit Action Items

Audit date: 2026-06-25; reconciled: 2026-08-22.

## Verdict

The app is not accepted for real-family production launch. The approved MVP queue is complete locally for public configuration, registration activation, team-builder publication, admin tenant scope, the three retained security fixes, durable public-intake limiting, and link-media Hide/Restore. `EXT-HOSTED-SESSION` is the only remaining definition-of-shipped gate. The current queue and owners live in [`docs/production-task-board.md`](production-task-board.md#current-business-priority-queue---2026-08-20); [`docs/backlog-closeout-2026-07-27.md`](backlog-closeout-2026-07-27.md) remains historical evidence. This file preserves dated audit evidence and risk context rather than creating a second priority list.

## Validation Run

The commands and production URLs in the dated bullets below are historical observations, not current execution instructions. In particular, earlier production-alias `qa:session-proof` results predate LP-QA-GUARD-001. That mutating harness and Communication Room record proof are now isolated-QA-only. Production acceptance requires `EXT-PRODUCTION-READONLY`.

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
- `npm run qa:tenant-readiness-proof` passed locally on 2026-07-16 against `http://localhost:3001`, proving signed-in QA admin access to `/admin/health` and `/admin/teams` with screenshots under `output/playwright/tenant-readiness/`. Hosted tenant-readiness proof remains open until the latest branch is deployed and rerun with `QA_PROOF_BASE_URL=https://www.leaguepilot.us`.
- `npm run qa:demo-tenant-proof` proves the fictional `LeaguePilot Demo League` locally with DEMO admin, coach, and parent browser sessions, service-role Supabase readback, delivery-attempt metadata, zero provider sends, and screenshots plus `demo-tenant-proof.json` under `output/playwright/demo-tenant/`.
- Tenant-readiness release validation on 2026-07-16 passed `git diff --check`, `npm test` (29 files, 231 tests), `npm run typecheck`, `npm run build`, and `npm audit` with 0 vulnerabilities.
- Communication Room isolated QA proof on 2026-07-24 applied repository migrations through `0024` plus `20260724143554_security_definer_execution_hardening.sql` to a separate disposable Supabase project. Real parent, coach, and anonymous sessions passed RLS proof. A signed-in parent browser session proved two linked children across two teams, excluded an archived team, persisted a reply, acknowledged a critical record with attributed audit history, retained a suppressed delivery attempt, executed zero provider sends, and left schedule, RSVP, attendance, and transportation truth unchanged. The full release gate passed 311 tests, typecheck, production build, lint with no errors, and `npm audit` with 0 vulnerabilities.
- Original audit worktree had only untracked local editor config; check current worktree state before release packaging.
- The integrated dependency review reports production dependencies clean under `npm audit --omit=dev`. The supported Next 16.2.9 ESLint graph still retains a development-only `minimatch` 3.1.5 / `brace-expansion` 1.1.16 advisory path; removing it currently requires unsupported peer overrides or weaker lint rules. This docs task attempted a live audit, but registry DNS was unavailable, so release automation must rerun both production-only and full audits.

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
   - Current status: covered for deployment `dpl_D8kTCkYhtrn6VA7VXrJAwM9kbYmf`; the newer tenant-readiness admin flow is locally proven but not yet covered by hosted proof.
   - Repeat when: production aliases, auth cookies, Supabase env values, role routing, or private route shells change.

## P1 Production Hardening

5. Provider sends are deferred from launch as draft/internal records only unless real email/SMS/Web Push delivery becomes explicit production scope.
   - Current truth: `DEC-PROVIDER` is draft-only for MVP. Notification records, approval review, and delivery-attempt logs exist; external email/SMS/Web Push sends remain intentionally disconnected.
   - MVP disposition: closed by decision. Product copy and readiness evidence must continue to describe drafts as internal records, not sent messages.
   - Reopen only by explicit decision: provider execution would require adapters, recipient preference enforcement, unsubscribe UI, retry backoff, signed webhooks, sandbox proof, cost controls, and separate production-send approval.

6. Finish notification provider execution if real alerts are required.
   - Current seams: `/api/provider-delivery/review`, `lib/supabase/provider-delivery.ts`, `lib/domain/notifications.ts`.
   - MVP disposition: postponed. Draft review and suppression remain in scope; provider execution does not.
   - Future done condition: approved attempts create real sandbox sends, rejected attempts suppress sends with audit logs, and provider receipts remain distinct from internal notification state.

7. Add browser-level live action tests for key private writes.
   - Current truth: the guarded isolated-QA harness now covers registration assigned-team activation, team-builder publish/replay/readback, link-media Hide/Restore, guardian media-consent grant/revoke, calendar/weather authorization denials, shared-counter burst/readback, provider-draft boundaries, and the core parent/coach/admin routes. Earlier hosted evidence also covers RSVP, snack, volunteer, preference, weekly-update, Parent Replay, and provider-review records.
   - Remaining action: execute the complete harness against the exact isolated deployment and matching Supabase project under `EXT-HOSTED-SESSION`. Do not target the production alias with mutating QA.
   - Done when: the exact deployed commit, ordered migration readback, target identity, signed-in role journeys, persistence readback, and cross-organization denials pass together.

8. Reconcile stale capability-matrix gaps.
   - Evidence: `docs/capability-matrix.md` still lists some gaps that later implementation covered, including team CRUD, division/season setup, coach assignment, roster lifecycle, tenant isolation, RSVP history UX, snack/volunteer reminders, caps, cancellation, and approval policies.
   - Status: done locally 2026-07-27. The matrix, Features tracker, legacy backlogs, production board, tech stack, and closeout ledger now separate committed implementation/tests, external proof, decision gates, and historical evidence.

9. Confirm admin operations are production-scoped on hosted data.
   - Current seams: `/admin/operations`, `/admin/security`, `/admin/teams`, `/admin/guardian-links`, `/admin/archive`.
   - Current truth: local adapters require explicit signed-in organization scope, and focused cross-tenant/source-contract tests pass. ICS export independently authorizes the requested team.
   - Remaining action: run the populated admin-path and denial proof on isolated QA under `EXT-HOSTED-SESSION`; production acceptance remains read-only.

10. Prove brand profiles across the 20 launch surfaces.
    - Current truth: `/admin/themes` now renders a 20-surface brand launch checklist, test-brand previews, metrics, monitoring events, alerts, coach feedback questions, and acceptance criteria. `team_brand_profiles`, validation runs, asset uploads, and brand monitoring events are modeled in Supabase with coach/admin RLS. `npm run qa:brand-proof` captures hosted browser proof for the checklist and monitoring contract.
    - MVP disposition: postponed outside the approved completion queue. Existing local and dated hosted evidence remains useful but does not block `EXT-HOSTED-SESSION`.
    - Future done condition: all 20 surfaces pass hosted QA, non-coaches cannot edit branding, fallback email branding works, and brand monitoring alerts are wired to production telemetry.

11. Add rate limits and abuse controls to public intake endpoints.
    - Current public endpoints: `/api/registration-requests` and `/api/mobile-usage-events`.
    - Current truth: both endpoints use the service-only Supabase `claim_public_rate_limit` shared counter across application instances. Registration is limited to 5 requests/minute/client and mobile telemetry to 120 requests/minute/client. Both return stable `429`, `Retry-After`, and `X-RateLimit-*` headers; shared-store failure returns retryable `503` without persistence and never falls back to process memory.
    - Local status: done with fourteen focused limiter/route tests and source readiness proof.
    - Remaining action: execute the guarded hosted burst plus six-hit counter readback against isolated QA under `EXT-HOSTED-SESSION`.

## P2 Product Decisions Before Wider Launch

12. Decide whether media uploads are in scope.
    - Decision: `DEC-MEDIA` is link-only for MVP. Authorized Hide/Restore is implemented locally; uploads, private storage, scanning, parent reporting, reject, and destructive removal are postponed.
    - Reopen only by explicit decision: add private storage, upload review policy, file limits, scanning, retention, and deletion/takedown workflow.

13. Keep sponsor billing proof-only.
    - Current truth: the organization-scoped sponsor commercial spine, append-only payment ledger, atomic Stripe evidence recording, refund/dispute/manual-payment idempotency, multi-invoice summaries, fulfillment evidence, and admin Sponsor Hub are implemented locally. Provider/payment gates remain disabled.
    - MVP disposition: `DEC-BILLING` is proof-only. Stripe sandbox settlement, hosted webhook/readback, finance reconciliation, renewal delivery, and production payment approval are postponed.
    - Boundary: sponsor commercial proof remains separate from child-facing sponsor display and does not expose payment state or private family data.

14. Keep native Expo deferred unless PWA metrics prove need.
    - Decision: `DEC-MOBILE` is PWA-first for MVP. PWA install and usage metrics exist; Expo and app-store work remain postponed.
    - Reopen only if `mobile_usage_events` shows a concrete need for app-store distribution, stronger native push, camera/media, or OS integration.

15. Keep AI provider output review-only unless evaluated.
    - Current truth: AI Coach Workspace starts with deterministic drafts and has an authenticated `/api/coach/ai-workspace` OpenAI Responses API rewrite path for assigned coaches/admins only. Requests use signed-in Supabase coach scope, `store: false`, local privacy filters, approved media only, source evidence, and review-only output. Hosted proof passed with `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:ai-coach-proof`, capturing `output/playwright/ai-coach-provider-rewrite-qa-session-live.png`. Parent Replay publishing remains deterministic and coach-reviewed.
    - Decision: deterministic drafts and production's existing review-only provider path remain unchanged; `DEC-PREVIEW-OPENAI` is disabled for MVP. Do not configure Preview OpenAI or copy production secrets to an all-branch Preview target.

16. Automatic team building foundation is now in scope.
    - Current truth: private birthdate-derived age/age-band, admin evaluation, sibling/guardian grouping, friend-request consideration, skill balance, locks, warnings, and Preview -> Edit -> Approve -> Publish persistence have committed domain/service/API/UI/migration/RLS tests. The local portion is done.
    - Remaining action before external closure: run signed-in isolated-QA admin publish/replay/RLS/readback proof under `EXT-HOSTED-SESSION`; no production mutation is authorized.

## Hosting And Network Boundary

- Vercel Static IP is not part of the current launch path. The app should use Supabase HTTPS APIs with Supabase Auth, RLS, and server-only service-role boundaries.
- Do not enable Supabase Postgres/pooler IP allowlisting for the Vercel app unless a static egress path is deliberately added, such as Vercel Static IP, a controlled proxy, or another fixed-egress deployment path.
- Direct database migration/proof commands should run from controlled local or CI environments using QA/prod-specific credentials, not from client-visible app code.

## Evidence To Preserve

- Keep `npm test`, `npm run build`, and final `npm run typecheck` outputs in release notes.
- Keep Supabase QA proof screenshots under `output/playwright/` as CI artifacts, not source-controlled files; preserve the passing 2026-06-28 workflow URL in release notes.
- Keep provider-send proof separate from notification-record proof: queued records are not sent messages.
- Keep AI Coach Workspace wording clear: deterministic draft generation is the default, OpenAI rewrites are provider-backed only through `/api/coach/ai-workspace`, and neither path publishes or sends automatically.
