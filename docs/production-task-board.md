# Production Task Board

This board makes the current launch and hardening plate concrete. It is scoped to the current Next.js + Supabase LeaguePilot app and should be reconciled with `docs/Features.md`, `docs/capability-matrix.md`, and `docs/production-audit-action-items.md` when a slice changes.

## Every-Task SaaS Check

Every non-trivial task must answer these fields before implementation or review:

| Field | Concrete answer required |
| --- | --- |
| Tenant context | Which `organization`, `season`, `team`, `player`, or `guardian` scope establishes the tenant boundary? |
| Tenant propagation | Where does that scope move through UI, route handler, Supabase adapter, RLS, audit row, provider record, export, cache, or screenshot proof? |
| Isolation proof | Which server check, RLS policy, route test, QA proof, or browser proof prevents cross-tenant/team data access? |
| Actor and authorization | Which verified actor can perform the action, and what object/action-specific permission is required? |
| State model | Which existing states are read or changed, and which transition helper, RPC, or service owns the transition? |
| Configuration | Is the behavior global, environment-specific, organization-level, team-level, user-level, or provider-gated? |
| Audit and observability | Which audit event, delivery attempt, metric, screenshot, log, or dashboard proves the action occurred safely? |
| Failure semantics | What happens if persistence, provider calls, auth, RLS, browser proof, or downstream reads fail halfway? |
| Idempotency/concurrency | What prevents duplicate writes, duplicate sends, replayed requests, double approval, or race conditions? |
| Security threat model | What new IDOR, tenant spoofing, mass assignment, privilege escalation, export leakage, webhook replay, or billing abuse risk is introduced? |

Task-specific checks are required only when the surface is touched:

| Surface | Extra checks |
| --- | --- |
| Billing/commercial | Account/customer/product/price/quote/order/contract/subscription/entitlement/usage/invoice/payment impact, revenue effect, Stripe proof, and reporting effect. |
| Provider/integration | API/event/webhook contract, secret ownership, retry policy, suppression, opt-in, delivery logs, and environment promotion. |
| Storage/files/search/cache/analytics | Tenant-scoped keys, object paths, search filters, export boundaries, BI dataset scope, AI context scope, and deletion/retention behavior. |
| Admin/support | Internal support access, repair/replay/override/export authority, break-glass approval, audit log, and tenant notification requirement. |
| Migration/rollout | Backfill plan, feature flag/cohort/env/tenant rollout, rollback behavior, and existing tenant compatibility. |

## Current 20-Item Plate

### Active Goal - Operational-Truth Hardening and Gated Enhancements

- Priority: P0 authority, privacy, and game-day reliability.
- Status: The complete chain installs on PostgreSQL 17. Isolated preview `gmrvnnkxksqkcxcmydhr` and production `dkwghvvlbdnnwzbnscvu` are both at 40 migrations through `20260726182645_optimize_rls_auth_initplans.sql`, both guarded follow-up plans are empty, all 49 initplan warnings are cleared, and each target's remaining 175 performance warnings are overlapping permissive policies. The separately approved production apply used no seed data. Production readback confirms RLS on all 92 public tables, the intended 58-table/20-table Data API split, unchanged normalized policy/grant/RLS-state digests and sampled application row counts, `btree_gist` in `extensions`, the valid field-reservation exclusion constraint, and zero error-level lint/advisor findings. Preview real-session parent/coach/anonymous RLS plus provider-free `0028` transportation and `0029` caregiver lifecycle proof pass after migration 40. Production received narrower read-only parent/coach/admin/anonymous session proof; those populated journeys were not run against production.
- Current state: authenticated context is server-derived; operational summaries use independent evidence/freshness lanes; RSVP and attendance use idempotency plus record/schedule versions; Parent Replay separates draft/approval/publication; provider acceptance/delivery/read/acknowledgment are independent; media is quarantined until scan/consent/release; Family Balance uses payment evidence instead of inferred seed charges; admin archive requires a recomputed impact preview and audit.
- Feature gates: offline replay needs `NEXT_PUBLIC_OFFLINE_WRITES_ENABLED`, `OFFLINE_WRITES_ENABLED`, and `organizations.offline_writes_enabled`. Provider sends, media uploads, and payments each need their server kill switch plus organization flag. Media additionally needs a proven scan adapter; payment confirmation additionally needs a verified Stripe webhook.
- Rollback: disable the environment switch or organization flag. Existing records remain; the affected surface returns to online-only, draft-only, quarantine/proof-only, or link-only behavior without deleting evidence.
- Proof queue: retain the isolated preview while completing cross-organization, cross-team, cross-family, wrong-role, concurrency, expiry, cache-clearing, correction, and downstream-refusal coverage. Review the remaining 175 permissive-policy overlaps by actor/action semantics. Run signed-in production role/browser and broader application-health proof, prove Realtime authorization/reconnect/change delivery, and close the production backup/PITR/restore gap. Provider, media, and payment slices remain separate allowlisted sandbox and hosted gates.
- Baseline ledger: LPM-001 records the current local proof boundary in `docs/production-proof-baseline-2026-07-29.md`. Treat that ledger as local documentation/repository proof only; it does not close hosted role browser proof, provider sends, Stripe settlement, private media storage/scanning, production Realtime, backup/PITR/restore, native app distribution, or production acceptance.
- Prompt workflow: `docs/prompt-evolution-timeline.md` and `tools/prompt-api/` encode the four-system prompt patterns. `npm run codex:spec` and `npm run codex:debug` print prompts only.
- Validation: `npm run check:skills`; `npm run typecheck`; `npm test`; `npm run build`; `npm audit`; `npm run qa:rls-proof`; role-browser screenshots at 375, 390, 768, and 1440.
- Admin proof closure verifier: `npm run qa:admin-proof-readiness` is a local repository-source gate for the LPM-004 seams only. It reads files and names missing contracts before hosted QA; it does not sign in, call Supabase, run Playwright, seed data, mutate hosted records, send providers, deploy, configure edge/firewall controls, or close production acceptance.
- Game-day communication readiness verifier: `npm run qa:game-day-communication-readiness` is a local repository-source gate for the LPM-005 game-day resolution, official correction/withdrawal, current-version family readback, and offline/reconnect seams only. It reads files and names missing contracts before hosted QA; it does not sign in, call Supabase, run Playwright, seed data, mutate hosted records, send providers, deploy, configure realtime/provider infrastructure, or close production acceptance.
- Family season continuity readiness verifier: `npm run qa:family-season-continuity-readiness` is a local repository-source gate for the LPM-006 private Parent Replay, media consent/revocation, private engagement, season transition review, apply/revert, and downstream refusal seams only. It reads files and names missing contracts before hosted QA; it does not sign in, call Supabase, run Playwright, seed data, mutate hosted records, send providers, upload media, create storage objects, deploy, configure storage/scanner/realtime/provider infrastructure, or close production acceptance.
- Private media storage readiness verifier: `npm run qa:private-media-storage-readiness` is a local repository-source gate for the LPM-008 private upload gates, tenant/team quarantine paths, scanner-processing evidence, family release/read privacy, retention/deletion, and report/moderation seams only. It reads files and names missing contracts before hosted QA; it does not sign in, call Supabase, run Playwright, seed data, mutate hosted records, upload media, create storage objects, download objects, call a scanner, call provider dashboards, configure secrets, deploy, or claim hosted, storage-provider, scanner-provider, or production acceptance. The remaining open gates are storage-provider setup, scanner-provider setup, hosted signed-upload proof, hosted scan proof, populated consent/revocation proof, deletion/retention proof, abuse/takedown proof, accessibility proof, and production acceptance.

### Active Goal - Approved Family Experience Execution

- Priority: P0 public trust, family access, and five-second logistics clarity.
- Governing contract: `docs/family-experience-blueprint.md` and the approved Figma frames linked from that document.
- Commit policy: implement, validate, and commit one coherent slice at a time. If an external provider, hosted environment, production promotion, or missing product authority blocks a slice, record the exact blocker and continue to the next safe slice.
- Current completed slices: Communication Room local implementation and isolated Supabase proof; Phase 0 public trust corrections; Phase 1 local access/activation; Phase 2 Family Mission Control; Phase 3 transportation and temporary care; Phase 4 immutable official communication, disruption propagation, and current-version acknowledgment; and Phase 5 private family Replay, consent-aware media, season continuity, and explainable readiness. Responsive proof exists for a primary surface in every phase; Phase 1 includes signed-in registration-review proof plus degraded additional-guardian browser proof.
- Current next slice: no safe local product slice remains in the approved six-stage family cycle. The dependency-ordered proof and promotion queue is maintained in `docs/family-experience-readiness-review-2026-07-24.md`.
- Supabase promotion snapshot (verified 2026-07-26): preview `gmrvnnkxksqkcxcmydhr` and production `dkwghvvlbdnnwzbnscvu` applied/read back `20260726182645_optimize_rls_auth_initplans.sql` as migration 40 after separate approvals, without seed data, and both guarded follow-up plans are empty. Performance Advisor warnings on each target moved from 224 to 175 by clearing all 49 `auth_rls_initplan` findings; the remaining 175 are overlapping permissive policies. Normalized policy, grant, and RLS-state digests are unchanged. All 92 production public tables retain RLS, sampled application row counts are unchanged, all 34 new workflow tables remain empty, and provider sends remain disabled. Preview parent/coach/anonymous RLS plus populated provider-free transportation/caregiver proof pass after the migration. Production read-only parent/coach/admin/anonymous session proof also passes without application mutations or provider calls, but signed-in browser and broader lifecycle proof remain open. Production error-level [database lint](https://supabase.com/docs/guides/database/database-linter) and advisors report no findings, and Security Advisor warnings remain zero. Realtime behavior, the permissive-policy actor/action review, provider behavior, and backup/PITR/restore acceptance remain open; PITR is disabled, the latest observed platform backup predates promotion, and no restore drill is proven. See `docs/supabase-migration-rehearsal-2026-07-26.md`.

| Family phase | Current status | Remaining outcome |
| --- | --- | --- |
| Phase 0 - Public trust corrections | Local implementation and 320/390/768/1440 browser proof complete; hosted proof pending | Configure `PUBLIC_ORGANIZATION_ID` and `PUBLIC_ACCESS_REVIEW_WINDOW` in the target environment, run `npm run qa:hosted-readiness-preflight` to clear hosted URL and QA command-input blockers, deploy, and repeat `npm run qa:public-family-proof` against the hosted URL. Public routes now use access-first CTAs, empty production forms, an agenda-first schedule, provider calendar actions, signed-in-value-gated installation, and a tangible privacy-safe Parent Replay preview. |
| Phase 1 - Access and activation | Local implementation complete; migrations `0025`-`0027` and `0033` are installed/read back on preview and production; `npm run qa:access-lifecycle-authority` is the local source-only authority verifier | Run the populated invitation/additional-guardian lifecycle, signed-in cross-family RLS, and responsive production browser proof. The verifier does not call Supabase, run browser proof, seed data, send providers, mutate hosted records, deploy, or close hosted acceptance. Provider delivery remains an independent external gate. Existing request status remains `pending`, `approved`, or `rejected`; no slice silently sends a provider message or expands approved child/team scope. |
| Phase 2 - Family Mission Control | Local five-second Event Passport, multi-child filters/agenda, explicit conflict evidence, version-aware RSVP review, blank coordination-note form, and signed-in 375/390/768/1440 empty-state proof complete | Prove a populated multi-child household, offline/reconnect conflicts, organization isolation, performance/accessibility, and production-hosted behavior. |
| Phase 3 - Responsibility and temporary care | `0028`/`0029` install locally and are installed/read back on preview and production. Preview proof passes for request → offer → mutual acceptance and caregiver create → wrong-email rejection → exact-email acceptance → revoke, including audit, schedule-version, token-rotation, no-membership, and zero-notification checks. | Add same-team competing-offer, cross-team/cross-family, expiry, cache-clear, and signed-in production browser proof. |
| Phase 4 - Priority communication and disruption | Local immutable versions, correction/withdrawal, exact schedule-version binding, four-surface projection, visible propagation incidents, current-version acknowledgment, responsive proof, and `npm run qa:game-day-communication-readiness` source-only readiness proof complete; `0030` is installed/read back on preview and production | Run hosted browser proof, Supabase readback, populated one-version family projection, incident lifecycle, offline/accessibility, provider sandbox/webhook, realtime/offline production behavior, and production acceptance. The verifier does not call Supabase, run browser proof, seed data, send providers, mutate hosted records, deploy, configure realtime/provider infrastructure, or close hosted acceptance. |
| Phase 5 - Parent Replay and season continuity | Local published-only family story, private engagement, consent-aware optional media, memory timeline, reviewed transition/source archival/safe correction, explainable readiness, responsive proof, and `npm run qa:family-season-continuity-readiness` source-only readiness proof complete; `0031`/`0032` are installed/read back on preview and production | Run hosted browser proof, Supabase readback, populated media consent/revocation proof, multi-guardian transition concurrency proof, storage/scanner proof, provider sandbox proof, retention, expiration/downstream refusal, accessibility, moderated-family proof, and production acceptance. The verifier does not call Supabase, run browser proof, seed data, send providers, upload media, create storage objects, mutate hosted records, deploy, configure storage/scanner/realtime/provider infrastructure, or close hosted acceptance. |

### Active Goal - Tenant Onboarding Readiness Lane

- Priority: P0 tenant readiness.
- Status: Local implementation and proof complete. Production tenant-readiness proof passed against `https://www.leaguepilot.us` on 2026-07-18; latest-preview proof is still blocked by Vercel Authentication until a bypass secret is configured or the deployment is explicitly promoted to Production.
- Current state: Slices 1 through 4 are implemented. `/admin/health` now loads tenant readiness from Supabase rows scoped to the signed-in organization admin and shows whether each organization has an active season, active teams, coach coverage, rostered players, family access path, scheduled events, and a provider-send boundary before inviting families. `/admin/teams` now gives admins a tenant setup guide, new season/team/player reset actions, and explicit empty-state blocking copy. `npm run qa:tenant-readiness-proof` signs in the QA admin, proves `/admin/health` plus `/admin/teams`, and captures screenshots under `output/playwright/tenant-readiness/`. `npm run qa:demo-tenant-proof` proves the fictional demo tenant with DEMO admin, coach, and parent sessions, Supabase readback, delivery-attempt metadata, zero provider sends, and screenshots under `output/playwright/demo-tenant/`.
- Blockers carried forward: the latest preview deployment cannot be browser-proven while Vercel Authentication blocks unauthenticated QA automation; Supabase Auth raw-signup email quota/SMTP capacity must not be the only tenant-admin onboarding path; live email/SMS/Web Push sends remain disconnected until the approved provider-send worker/adapters/webhooks slice is implemented and proven.
- Next slices: run `npm run qa:hosted-readiness-preflight` with the explicit hosted URL, public organization, review window, and QA admin command inputs, then either configure a Vercel automation bypass for preview proof or explicitly promote the current preview to Production. After the gate passes, rerun `PUBLIC_FAMILY_BASE_URL=https://www.leaguepilot.us QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:public-family-proof` and `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:tenant-readiness-proof`, then resume the P1 proof queue starting with media report/moderation, registration approval, and team-builder publish browser proof. The preflight is not hosted acceptance and performs no deployment, provider send, payment, media, migration, Supabase seed/write, or production-acceptance action.
- Seams: `/admin/health`, `/admin/teams`, `lib/supabase/tenant-readiness.ts`, `components/feature-panels.tsx`, `app/admin/_surfaces.tsx`.
- SaaS constants focus: tenant context, tenant propagation, isolation proof, actor authorization, failure semantics, public-family invite boundary.
- Validation: `lib/supabase/tenant-readiness.test.ts`; `components/feature-panels.test.tsx`; `app/route-guards.test.ts`; `app/routes-smoke.test.ts`; `npm run qa:tenant-readiness-proof`; `npm run qa:demo-tenant-proof`; `npm run typecheck`; `npm test`; `npm run build`; `git diff --check`.

### LP-001 - Reconcile Product Truth Docs

- Priority: P0 docs/safety.
- Current state: `docs/capability-matrix.md` and older stack/backlog wording still contain gaps or scaffold framing that later work covered.
- Seams: `docs/Features.md`, `docs/capability-matrix.md`, `docs/feature-fit-backlog.md`, `docs/production-audit-action-items.md`, `docs/tech-stack.md`, ROMINA reference.
- Done when: the docs agree on shipped, partial, deferred, provider-gated, and hosted-proof status.
- SaaS constants focus: tenant context, proof boundary, backward compatibility, release governance.
- Validation: `git diff --check`; no runtime test required unless code changes.

### LP-002 - Prove Coach Weekly Update Browser Write

- Priority: P1 proof.
- Status: Done 2026-07-02.
- Current state: hosted browser proof now covers the signed-in QA coach path. The proof saves a weekly update through `/coach`, verifies the announcement row plus pending `team_broadcast` notification draft in Supabase, confirms no provider delivery attempts were created, and preserves `output/playwright/coach-weekly-update-qa-session-live.png`.
- Seams: `/coach`, `/api/coach/weekly-update`, `lib/domain/communications.ts`, `scripts/verify-qa-session-paths.mjs`.
- Done when: met. The coach dashboard now targets the next scheduled event team, falling back to the active-season team, so archived team memberships do not receive current weekly updates.
- SaaS constants focus: tenant/team scope, actor authorization, notification draft state, auditability, provider-send boundary.
- Validation: `npm run supabase:qa-users`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof`; hosted deployment `dpl_ERncYiyZE3BXSz8TJHzKHsu7DPGZ`.

### LP-003 - Prove Media Report Browser Write

- Priority: P1 proof.
- Current state: API/domain coverage exists; hosted browser proof for family media report remains open.
- Seams: `/parent`, `/team-portal`, `/api/media/report`, `lib/supabase/media-governance.ts`.
- Done when: signed-in QA parent reports approved team media from a parent-visible surface, Supabase reflects report count/status change, and unrelated team media remains invisible.
- SaaS constants focus: tenant isolation, child/media privacy, state transition, audit event, abuse prevention.
- Validation: `npm run qa:admin-proof-readiness`; focused route/browser proof plus `npm test` if route code changes.

### LP-004 - Prove Media Moderation Browser Write

- Priority: P1 proof.
- Current state: admin/coach hide/restore/remove APIs exist; hosted browser proof is not complete.
- Seams: `/admin`, `/api/media/moderation`, `lib/supabase/media-governance.ts`.
- Done when: signed-in admin or assigned coach hides/restores/removes a QA media item through browser UI and parent/team reads honor the moderation state.
- SaaS constants focus: tenant isolation, reviewer role, moderation state, auditability, support/admin action risk.
- Validation: `npm run qa:admin-proof-readiness`; browser proof with Supabase readback; `npm test` if code changes.

### LP-005 - Prove Registration Approval Browser Flow

- Priority: P1 proof.
- Current state: RPC/API flow exists and live approval/rejection was verified earlier; `npm run qa:access-lifecycle-authority` now provides local repository-source proof for session-derived, review-gated, provider-free registration authority; browser-level hosted proof and Supabase readback remain open.
- Seams: `/admin/registrations`, `/api/admin/registrations/*`, `lib/supabase/registration-approvals.ts`, `scripts/verify-access-lifecycle-authority.mjs`, `supabase/migrations/0003_registration_approval_workflow.sql`, `0004_fix_registration_approval_digest.sql`, `0033_registration_invitation_issuance.sql`.
- Done when: signed-in QA admin approves and rejects temporary registration requests from the hosted UI, with player/guardian/invite/action rows created or updated correctly.
- SaaS constants focus: guardian access grant, tenant isolation, actor authorization, lifecycle reversal, audit log, idempotent approval.
- Validation: `npm run qa:access-lifecycle-authority`; hosted Playwright proof with cleanup and Supabase readback.

### LP-006 - Harden Guardian Verification Policy

- Priority: P1 safety.
- Current state: registration approval and guardian-link repair now require an active organization-admin reviewer, an existing parent profile, and bounded verification evidence; invite acceptance and additional-guardian review are covered by the local source-only authority verifier. An existing profile email match remains only a correlation signal, while unmatched parents stay invited. Hosted/browser proof, Supabase readback, and any stronger identity-verification provider remain open.
- Seams: `/admin/registrations`, `/admin/guardian-links`, registration approval RPCs, guardian repair API, `lib/supabase/invite-acceptance.ts`, `lib/supabase/additional-guardians.ts`, `scripts/verify-access-lifecycle-authority.mjs`, `docs/privacy-security.md`.
- Done when: docs and tests define what evidence is enough to link a parent to a child/team and what remains admin-reviewed. Local policy and migration installation are covered; production RLS/browser proof and any stronger identity evidence remain follow-up work.
- SaaS constants focus: identity, authorization, child privacy, support repair, auditability, failure semantics.
- Validation: `npm run qa:access-lifecycle-authority`; `lib/supabase/registration-approvals.test.ts`; `supabase/rls-policy.test.ts`; production signed-in RLS/browser proof for operational closure.

### LP-007 - Prove Team-Builder Admin Publish

- Priority: P1 proof.
- Current state: preview and admin-only tables exist; browser publish proof remains open.
- Seams: `/admin`, `/admin/teams`, team-builder domain/service code, `team_build_plans`.
- Done when: QA admin previews, edits/approves, and publishes a team-build plan through the browser with persisted plan/audit evidence and no cross-org writes.
- SaaS constants focus: tenant scope, lifecycle state, idempotency, concurrency, audit log, migration compatibility.
- Validation: `npm run qa:admin-proof-readiness`; browser proof with Supabase readback and `npm run qa:rls-proof` if policies change.

### LP-008 - Add Team-Builder Production Data Fields

- Priority: P2 product hardening.
- Current state: balance, sibling/guardian, friend request, and skill constraints exist; explicit age-band/player-evaluation fields remain a production gap.
- Seams: team-builder domain/service, Supabase migrations, admin UI.
- Done when: player age/evaluation inputs are modeled, permission-checked, migrated, and included in preview/publish logic without exposing private child detail to parents.
- SaaS constants focus: data model, migration/rollout, tenant isolation, child privacy, backward compatibility.
- Validation: migration/RLS tests, focused domain tests, `npm run typecheck`, `npm test`.

### LP-009 - Prove Admin Operations Hosted Scope

- Priority: P1 proof.
- Current state: `/admin/operations` and `/admin/security` have hosted proof; export service reads now narrow related rows and profiles to the selected organization scope, with local cross-tenant regression coverage. Broader admin surfaces still need signed-in hosted proof.
- Seams: `/admin/teams`, `/admin/guardian-links`, `/admin/archive`, `/admin/operations`, `/admin/security`.
- Done when: signed-in QA admin sees only the intended organization data across all admin surfaces and screenshots are preserved.
- SaaS constants focus: tenant isolation, support/admin operations, audit logs, observability by tenant.
- Validation: `lib/supabase/reporting.test.ts`; hosted browser proof and `npm run qa:rls-proof`.

### LP-010 - Add Public Intake Abuse Controls

- Priority: P1 safety.
- Current state: public endpoints remain intentionally unauthenticated. A bounded in-process fixed-window limiter now rejects registration bursts at 5 requests/minute/client and mobile telemetry bursts at 60 requests/minute/client, returning `429`, `Retry-After`, and `X-RateLimit-*` headers. This is route-level protection; a shared store or provider edge firewall is still required for full multi-instance enforcement.
- Seams: `/api/registration-requests`, `/api/mobile-usage-events`, Vercel/firewall config if used.
- Done when: burst requests are throttled or rejected at the route boundary, behavior is documented, legitimate family signup/usage telemetry still works, and hosted edge/shared-store enforcement is proven for the deployed topology.
- SaaS constants focus: noisy-neighbor control, rate limits, tenant spoofing, public attack path, observability.
- Validation: `app/public-intake-rate-limit.test.ts`; `npm test`; `npm run typecheck`; hosted burst proof or provider-firewall evidence for full production closure.

### LP-011 - Prove Hosted AI Coach Rewrite

- Priority: P1 provider proof.
- Status: Done 2026-07-02.
- Current state: server route and provider env exist for production/development. `/coach/parent-replay` now loads signed-in Supabase coach scope before AI provider requests, and hosted browser proof passed against `https://www.leaguepilot.us`.
- Seams: `/coach/parent-replay`, `/api/coach/ai-workspace`, `lib/services/ai-coach/`.
- Done evidence: assigned QA coach requested a hosted OpenAI rewrite, output remained draft/review-only, no publish/send occurred, and source/privacy boundaries stayed visible.
- SaaS constants focus: tenant-scoped AI context, provider contract, auditability, failure behavior, prompt/data leakage.
- Validation: `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:ai-coach-proof`; `output/playwright/ai-coach-provider-rewrite-qa-session-live.png`; provider route tests.

### LP-012 - Expand AI Safety Evals

- Priority: P1 safety.
- Status: Done 2026-07-02.
- Current state: AI safety eval coverage now covers hidden media, hidden chat messages, cross-team context, private contacts, unsupported provider-send/publish claims, and obvious unsourced private/external claims.
- Seams: `docs/evaluation-plan.md`, AI Coach tests, provider tests.
- Done evidence: eval cases reject or constrain requests for cross-team data, private contacts, hidden media/messages, unsupported provider sends, and unsourced facts.
- SaaS constants focus: tenant isolation, search/AI context isolation, security threat model, auditability.
- Validation: `npm test -- components/feature-panels.test.tsx lib/services/ai-coach/ai-coach-provider.test.ts lib/domain/domain.test.ts app/api/coach/ai-workspace/route.test.ts app/routes-smoke.test.ts`; full `npm test`.

### LP-013 - Decide Vercel Preview OpenAI Env Target

- Priority: P2 release governance.
- Status: Deferred from launch 2026-07-02.
- Current state: Preview OpenAI env values remain unset. Preview is explicitly out of launch scope until a named non-production preview branch is chosen; production secrets are not copied to an all-branch Preview target.
- Seams: Vercel env config, `docs/runbook.md`, AI Coach provider docs.
- Done evidence: Preview remains explicitly out of scope, with no production secret leakage.
- SaaS constants focus: environment governance, provider secret ownership, rollout/rollback, tenant preview safety.
- Validation: docs/runbook and production tracker reconciliation.

### LP-014 - Decide Provider-Send Launch Scope

- Priority: P1 product/safety decision.
- Status: Decided for launch 2026-07-02.
- Current state: records, review, attempts, preferences, retry plans exist; live email/SMS/Web Push sends are disconnected. Launch scope is draft/internal records only.
- Seams: `/api/provider-delivery/review`, `lib/supabase/provider-delivery.ts`, `lib/domain/notifications.ts`, launch copy/runbook.
- Done evidence: launch explicitly says "draft/internal records only"; live provider sends require a separate implementation slice.
- SaaS constants focus: provider contracts, opt-in, billing/cost, failure semantics, idempotency, audit logs.
- Validation: docs reconciliation if deferred; provider tests if implemented.

### LP-015 - Implement Real Provider Sends If Approved

- Priority: P2 conditional.
- Current state: intentionally disconnected. The configured Supabase project now has `notification_delivery_attempts` execution metadata from `0021_notification_delivery_execution.sql`, including `idempotency_key`, retry locks, retry counts, provider response JSON, webhook IDs, and `dead_lettered_at`. The fictional demo tenant seed and `npm run qa:demo-tenant-proof` verify provider sends at zero and demo delivery-attempt rows carrying idempotency and dead-letter metadata. `npm run qa:provider-sandbox-readiness` is the local repository readiness proof only for the provider sandbox contract. Live sends still require the approved worker/adapters/webhooks proof slice.
- Seams: provider delivery service, Web Push VAPID, email/SMS provider adapters, provider webhooks, delivery attempts.
- Done when: approved attempts create real sandbox sends, rejected/suppressed attempts do not send, webhooks update delivery state, and retries are idempotent.
- SaaS constants focus: provider contract, consent, suppression, retry, webhook replay, noisy-neighbor, billing/cost.
- Validation: `npm run qa:provider-sandbox-readiness`; provider sandbox tests, webhook tests, `npm test`, `npm run typecheck`, hosted proof.
- Open gates: real sandbox email, SMS, and Web Push sends, provider dashboard setup, provider secrets, adult QA recipient approval, an adult-consented QA allowlist per channel, signed webhook endpoint registration, hosted worker execution, cost monitoring with a cost cap, rollback, and production-send approval. The verifier does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, send email, SMS, or Web Push, call provider dashboards, configure secrets, deploy, or claim sandbox, hosted, provider, or production acceptance.

### LP-016 - Prove Weather Provider Credentials And Actions

- Priority: P1 proof.
- Current state: NWS first, Open-Meteo fallback, optional Tomorrow.io; draft rows only.
- Seams: `/coach`, `/api/weather-alerts/draft`, `lib/services/weather/`, provider delivery review.
- Done when: hosted proof shows credential readiness/fallback behavior and a signed-in coach/admin creates a weather draft without parent delivery.
- SaaS constants focus: provider boundary, team/event scope, draft state, failure fallback, observability.
- Validation: weather provider tests, hosted browser proof, Supabase readback.

### LP-017 - Prove Multi-Brand Launch Surfaces

- Priority: P2 launch polish.
- Current state: single hosted brand proof exists for the 20-surface checklist; several real test brands remain open.
- Seams: `/admin/themes`, `team_brand_profiles`, brand validation runs, brand monitoring events.
- Done when: several distinct test brands pass the hosted 20-surface checklist and non-coaches cannot edit branding.
- SaaS constants focus: tenant configuration, cache invalidation, role authorization, audit/versioning.
- Validation: `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:brand-proof` plus browser screenshots.

### LP-018 - Prove Provider-Backed Brand Rendering Boundary

- Priority: P2 provider/rendering.
- Current state: web previews and metadata exist; binary upload, public logo rendering, email rendering, and push identity remain provider-gated.
- Seams: `/admin/themes`, `/api/admin/team-logos`, storage/provider render paths when chosen.
- Done when: docs or implementation clearly separate web preview proof from storage/email/push rendering proof.
- SaaS constants focus: storage/files isolation, provider contract, cache keys, tenant config, backward compatibility.
- Validation: docs-only `git diff --check` if deferred; provider/storage/browser tests if implemented.

### LP-019 - Decide Media Upload Storage Scope

- Priority: P2 product decision.
- Current state: link-based Google Photos/YouTube media with validation, reporting, and moderation; upload storage provider is not configured.
- Seams: media governance service, storage provider, `/api/media/*`, brand/media docs.
- Local verifier: `npm run qa:private-media-storage-readiness` proves repository-source readiness only for the existing private upload gates, tenant/team quarantine paths, scanner evidence, family release/read privacy, retention/deletion evidence, reports, and moderation/takedown seams. It is not hosted, storage-provider, scanner-provider, or production acceptance.
- Done when: launch either stays link-based or scopes Supabase Storage/private asset provider with upload review, file limits, scanning, deletion, and takedown policy. The remaining open gates are storage-provider setup, scanner-provider setup, hosted signed-upload proof, hosted scan proof, populated consent/revocation proof, deletion/retention proof, abuse/takedown proof, accessibility proof, and production acceptance.
- SaaS constants focus: file isolation, child privacy, storage paths, retention, support export/delete, abuse control.
- Validation: docs-only if deferred; storage/provider tests if implemented.

### LP-020 - Decide Sponsor Billing And Stripe Scope

- Priority: P2 commercial decision.
- Current state: sponsor billing proof records exist; live Stripe collection is disconnected.
- Seams: `/admin`, `/api/admin/sponsors`, sponsor billing tables, Stripe provider adapter if added.
- Done when: sponsor billing stays proof-only or Stripe Product/Price/Invoice/Checkout plus webhook signature proof is scoped.
- Local verifier: `npm run qa:sponsor-stripe-readiness` is local repository readiness proof only for the sponsor billing/payment boundary, server-side Checkout Session contract, server-only key handling, webhook settlement truth, admin/public privacy separation, and open payment gates. It does not call Stripe, Supabase, sign in, run Playwright, seed data, mutate hosted records, create Checkout Sessions, configure API keys or webhook secrets, register webhook endpoints, charge or refund payments, call provider dashboards, deploy, or claim sandbox, hosted, provider, finance, production payment, or production acceptance.
- Open gates: Stripe sandbox account setup, restricted key creation, webhook endpoint registration, signing-secret configuration, sandbox Checkout Session proof, signed webhook replay/duplicate proof, refund/failure proof, hosted admin proof, finance reconciliation, and production payment approval. Restricted API keys are preferred, separate environments are required, and no Stripe secret or restricted key values are stored in source.
- SaaS constants focus: commercial objects, billing/metering, revenue impact, entitlement, payment failure, webhook replay, finance reporting.
- Validation: docs-only if deferred; Stripe sandbox tests and webhook proof if implemented.

## Concrete Task Template

Use this block in issue notes, implementation plans, or final summaries for any item above:

```text
Task ID:
Tenant context:
Actor and authorization:
Objects and states touched:
Provider/commercial/storage impact:
Isolation proof:
Audit/observability proof:
Failure/idempotency handling:
Security threat checked:
Validation commands:
Docs updated:
```
