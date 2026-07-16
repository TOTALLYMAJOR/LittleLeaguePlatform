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

### LP-001 - Reconcile Product Truth Docs

- Priority: P0 docs/safety.
- Status: Updated 2026-07-16.
- Current state: `docs/capability-matrix.md`, `docs/Features.md`, `docs/feature-fit-backlog.md`, `docs/production-audit-action-items.md`, `docs/backlog-now.md`, `docs/backlog-next.md`, and `docs/runbook.md` now separate shipped code from hosted-proof, provider-credential, storage-scanning, Stripe, and team-builder-publish gaps.
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
- Current state: QA session proof coverage added 2026-07-16. The script now signs in as the QA parent, reports a resettable approved media row through `/api/media/report`, verifies `report_count`, pending moderation status, and `media_reported` audit evidence in Supabase, and preserves `output/playwright/media-report-qa-session-live.png`.
- Seams: `/parent`, `/team-portal`, `/api/media/report`, `lib/supabase/media-governance.ts`.
- Done when: hosted QA run captures the signed-in parent media-report proof and Supabase readback on the production deployment.
- SaaS constants focus: tenant isolation, child/media privacy, state transition, audit event, abuse prevention.
- Validation: `node --check scripts/verify-qa-session-paths.mjs`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof` when QA credentials are available.

### LP-004 - Prove Media Moderation Browser Write

- Priority: P1 proof.
- Current state: QA session proof coverage added 2026-07-16. The script now signs in as the QA admin, hides the QA media row through `/api/media/moderation`, verifies hidden status, organization visibility, reviewer metadata, and `media_hidden` audit evidence, and preserves `output/playwright/media-moderation-qa-session-live.png`.
- Seams: `/admin`, `/api/media/moderation`, `lib/supabase/media-governance.ts`.
- Done when: hosted QA run captures the signed-in admin moderation proof and Supabase readback on the production deployment.
- SaaS constants focus: tenant isolation, reviewer role, moderation state, auditability, support/admin action risk.
- Validation: `node --check scripts/verify-qa-session-paths.mjs`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof` when QA credentials are available.

### LP-005 - Prove Registration Approval Browser Flow

- Priority: P1 proof.
- Current state: QA session proof coverage added 2026-07-16. The script now creates disposable pending registration requests, signs in as the QA admin on `/admin/registrations`, approves and rejects through the authenticated review APIs, verifies request state, `registration_approval_actions`, and audit rows, and preserves `output/playwright/registration-approval-qa-session-live.png` plus `output/playwright/registration-rejection-qa-session-live.png`.
- Seams: `/admin/registrations`, `/api/admin/registration-requests/*`, `supabase/migrations/0003_registration_approval_workflow.sql`, `0004_fix_registration_approval_digest.sql`.
- Done when: hosted QA run captures signed-in admin approval/rejection proof and Supabase readback on the production deployment.
- SaaS constants focus: guardian access grant, tenant isolation, actor authorization, lifecycle reversal, audit log, idempotent approval.
- Validation: `node --check scripts/verify-qa-session-paths.mjs`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof` when QA credentials are available.

### LP-006 - Harden Guardian Verification Policy

- Priority: P1 safety.
- Current state: registration approval creates links; broader guardian verification policy is still called out as a gap.
- Seams: `/admin/registrations`, `/admin/guardian-links`, registration approval RPCs, guardian repair API, `docs/privacy-security.md`.
- Done when: docs and tests define what evidence is enough to link a parent to a child/team and what remains admin-reviewed.
- SaaS constants focus: identity, authorization, child privacy, support repair, auditability, failure semantics.
- Validation: focused policy tests or docs-only `git diff --check` depending on scope.

### LP-007 - Prove Team-Builder Admin Publish

- Priority: P1 proof.
- Current state: blocked as of 2026-07-16. Preview and admin-only tables exist, but the current UI explicitly states roster/bracket previews do not publish teams, schedules, seeds, or standings, and no authenticated team-builder publish API/service route exists to exercise.
- Seams: `/admin`, `/admin/teams`, team-builder domain/service code, `team_build_plans`.
- Done when: QA admin previews, edits/approves, and publishes a team-build plan through the browser with persisted plan/audit evidence and no cross-org writes.
- Next action: implement the production team-builder publish route/service with role checks, idempotency, audit rows, and readback before adding hosted browser publish proof.
- SaaS constants focus: tenant scope, lifecycle state, idempotency, concurrency, audit log, migration compatibility.
- Validation: browser proof with Supabase readback and `npm run qa:rls-proof` if policies change.

### LP-008 - Add Team-Builder Production Data Fields

- Priority: P2 product hardening.
- Current state: balance, sibling/guardian, friend request, and skill constraints exist; explicit age-band/player-evaluation fields remain a production gap.
- Seams: team-builder domain/service, Supabase migrations, admin UI.
- Done when: player age/evaluation inputs are modeled, permission-checked, migrated, and included in preview/publish logic without exposing private child detail to parents.
- SaaS constants focus: data model, migration/rollout, tenant isolation, child privacy, backward compatibility.
- Validation: migration/RLS tests, focused domain tests, `npm run typecheck`, `npm test`.

### LP-009 - Prove Admin Operations Hosted Scope

- Priority: P1 proof.
- Current state: `/admin/operations`, `/admin/observability`, and `/admin/security` have local route/test coverage; `/admin/operations` and `/admin/security` have hosted proof. Broader admin surfaces need signed-in admin proof.
- Seams: `/admin/teams`, `/admin/guardian-links`, `/admin/archive`, `/admin/operations`, `/admin/observability`, `/admin/security`.
- Done when: signed-in QA admin sees only the intended organization data across all admin surfaces, observability reads only expected Supabase audit/attempt/moderation rows, and screenshots are preserved.
- SaaS constants focus: tenant isolation, support/admin operations, audit logs, observability by tenant.
- Validation: hosted browser proof and `npm run qa:rls-proof`.

### LP-010 - Add Public Intake Abuse Controls

- Priority: P1 safety.
- Status: Implemented locally 2026-07-16; hosted proof still pending.
- Current state: public endpoints remain intentionally unauthenticated but now use Supabase-backed durable rate-limit buckets with memory fallback if the shared store is unavailable.
- Seams: `/api/registration-requests`, `/api/mobile-usage-events`, `lib/supabase/public-rate-limit.ts`, `supabase/migrations/0022_public_rate_limits.sql`.
- Done when: hosted proof shows the durable limiter and headers in the deployed environment without blocking normal family use.
- SaaS constants focus: noisy-neighbor control, rate limits, tenant spoofing, public attack path, observability.
- Validation: `app/api-public-intake.test.ts`, `lib/supabase/public-rate-limit.test.ts`, `npm test`, `npm run typecheck`.

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
- Status: Superseded by provider-send implementation slices beginning 2026-07-16.
- Current state: records, review, attempts, preferences, retry plans, worker metadata, env-gated SendGrid/Twilio/Web Push adapters, and SendGrid/Twilio webhook reconciliation exist. Launching real sends still requires configured secrets, worker secret, and hosted provider proof.
- Seams: `/api/provider-delivery/review`, `lib/supabase/provider-delivery.ts`, `lib/domain/notifications.ts`, launch copy/runbook.
- Done evidence: provider-send scope is now explicit: only approved queued attempts may be executed by the secret-gated worker, and missing credentials/preferences suppress without sending.
- SaaS constants focus: provider contracts, opt-in, billing/cost, failure semantics, idempotency, audit logs.
- Validation: docs reconciliation if deferred; provider tests if implemented.

### LP-015 - Implement Real Provider Sends If Approved

- Priority: P1 provider proof.
- Status: Implemented locally 2026-07-16; hosted credential proof pending.
- Current state: worker foundation, env-gated SendGrid, Twilio Messaging Service, Web Push adapters, suppression/retry/dead-letter handling, and SendGrid/Twilio webhook reconciliation are implemented locally; hosted credential proof remains pending.
- Seams: provider delivery service, Web Push VAPID, email/SMS provider adapters, provider webhooks, delivery attempts.
- Done when: approved attempts create real sandbox sends, rejected/suppressed attempts do not send, webhooks update delivery state, retries are idempotent, and hosted proof verifies the configured provider path.
- SaaS constants focus: provider contract, consent, suppression, retry, webhook replay, noisy-neighbor, billing/cost.
- Validation: provider sandbox tests, webhook tests, `npm test`, `npm run typecheck`, hosted proof.

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
- Validation: `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:brand-proof`, `npm run qa:pwa-cache-proof`, and browser screenshots after a real brand revision bump.

### LP-018 - Prove Provider-Backed Brand Rendering Boundary

- Priority: P2 provider/rendering.
- Current state: web previews and metadata exist; binary upload, public logo rendering, email rendering, and push identity remain provider-gated.
- Seams: `/admin/themes`, `/api/admin/team-logos`, storage/provider render paths when chosen.
- Done when: docs or implementation clearly separate web preview proof from storage/email/push rendering proof.
- SaaS constants focus: storage/files isolation, provider contract, cache keys, tenant config, backward compatibility.
- Validation: docs-only `git diff --check` if deferred; provider/storage/browser tests if implemented.

### LP-019 - Decide Media Upload Storage Scope

- Priority: P2 product decision.
- Current state: Supabase Storage upload intent/finalize APIs are implemented for authenticated active team members and organization admins. Uploaded JPEG/PNG/WebP/MP4 rows use organization/team-scoped object paths, file size/type validation, pending moderation, upload status, scan status, retention policy, and takedown metadata. Parent/team reads continue to load approved media only.
- Remaining action: prove the hosted `team-media` bucket or configured replacement, run browser proof for file upload/finalize/approval/parent visibility, and add automated scanning provider proof if required by policy. Current code marks finalized uploads with `scan_status=not_configured` until that provider is connected.
- Seams: `/api/media/uploads/intent`, `/api/media/uploads/finalize`, `/api/media/moderation`, `lib/supabase/media-uploads.ts`, `lib/supabase/media-governance.ts`, `supabase/migrations/0024_media_upload_storage_pipeline.sql`.
- Done when: hosted proof shows upload intent, Storage object creation, finalize, moderation approval, and approved-only family visibility against the production Supabase project.
- SaaS constants focus: file isolation, child privacy, storage paths, retention, support export/delete, abuse control.
- Validation: `lib/supabase/media-uploads.test.ts`, route session-spoof tests, hosted browser proof when Storage bucket credentials exist.

### LP-020 - Decide Sponsor Billing And Stripe Scope

- Priority: P2 commercial decision.
- Current state: sponsor billing proof records exist; live Stripe collection is disconnected.
- Seams: `/admin`, `/api/admin/sponsors`, sponsor billing tables, Stripe provider adapter if added.
- Done when: sponsor billing stays proof-only or Stripe Product/Price/Invoice/Checkout plus webhook signature proof is scoped.
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
