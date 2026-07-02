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
- Current state: `docs/capability-matrix.md` and older stack/backlog wording still contain gaps or scaffold framing that later work covered.
- Seams: `docs/Features.md`, `docs/capability-matrix.md`, `docs/feature-fit-backlog.md`, `docs/production-audit-action-items.md`, `docs/tech-stack.md`, ROMINA reference.
- Done when: the docs agree on shipped, partial, deferred, provider-gated, and hosted-proof status.
- SaaS constants focus: tenant context, proof boundary, backward compatibility, release governance.
- Validation: `git diff --check`; no runtime test required unless code changes.

### LP-002 - Prove Coach Weekly Update Browser Write

- Priority: P1 proof.
- Current state: route-level tests cover the verified session path; hosted browser proof is still missing.
- Seams: `/coach`, `/api/coach/weekly-update`, `lib/domain/communications.ts`, `scripts/verify-qa-session-paths.mjs`.
- Done when: signed-in QA coach saves a weekly update through the browser, Supabase rows show announcement plus pending `team_broadcast` notification drafts, and screenshots/traces are preserved.
- SaaS constants focus: tenant/team scope, actor authorization, notification draft state, auditability, provider-send boundary.
- Validation: `npm run supabase:qa-users`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof` after script extension.

### LP-003 - Prove Media Report Browser Write

- Priority: P1 proof.
- Current state: API/domain coverage exists; hosted browser proof for family media report remains open.
- Seams: `/parent`, `/team-portal`, `/api/media/report`, `lib/supabase/media-governance.ts`.
- Done when: signed-in QA parent reports approved team media from a parent-visible surface, Supabase reflects report count/status change, and unrelated team media remains invisible.
- SaaS constants focus: tenant isolation, child/media privacy, state transition, audit event, abuse prevention.
- Validation: focused route/browser proof plus `npm test` if route code changes.

### LP-004 - Prove Media Moderation Browser Write

- Priority: P1 proof.
- Current state: admin/coach hide/restore/remove APIs exist; hosted browser proof is not complete.
- Seams: `/admin`, `/api/media/moderation`, `lib/supabase/media-governance.ts`.
- Done when: signed-in admin or assigned coach hides/restores/removes a QA media item through browser UI and parent/team reads honor the moderation state.
- SaaS constants focus: tenant isolation, reviewer role, moderation state, auditability, support/admin action risk.
- Validation: browser proof with Supabase readback; `npm test` if code changes.

### LP-005 - Prove Registration Approval Browser Flow

- Priority: P1 proof.
- Current state: RPC/API flow exists and live approval/rejection was verified earlier; browser-level hosted proof remains open.
- Seams: `/admin/registrations`, `/api/admin/registrations/*`, `supabase/migrations/0003_registration_approval_workflow.sql`, `0004_fix_registration_approval_digest.sql`.
- Done when: signed-in QA admin approves and rejects temporary registration requests from the hosted UI, with player/guardian/invite/action rows created or updated correctly.
- SaaS constants focus: guardian access grant, tenant isolation, actor authorization, lifecycle reversal, audit log, idempotent approval.
- Validation: hosted Playwright proof with cleanup and Supabase readback.

### LP-006 - Harden Guardian Verification Policy

- Priority: P1 safety.
- Current state: registration approval creates links; broader guardian verification policy is still called out as a gap.
- Seams: `/admin/registrations`, `/admin/guardian-links`, registration approval RPCs, guardian repair API, `docs/privacy-security.md`.
- Done when: docs and tests define what evidence is enough to link a parent to a child/team and what remains admin-reviewed.
- SaaS constants focus: identity, authorization, child privacy, support repair, auditability, failure semantics.
- Validation: focused policy tests or docs-only `git diff --check` depending on scope.

### LP-007 - Prove Team-Builder Admin Publish

- Priority: P1 proof.
- Current state: preview and admin-only tables exist; browser publish proof remains open.
- Seams: `/admin`, `/admin/teams`, team-builder domain/service code, `team_build_plans`.
- Done when: QA admin previews, edits/approves, and publishes a team-build plan through the browser with persisted plan/audit evidence and no cross-org writes.
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
- Current state: `/admin/operations` and `/admin/security` have hosted proof; broader admin surfaces need signed-in admin proof.
- Seams: `/admin/teams`, `/admin/guardian-links`, `/admin/archive`, `/admin/operations`, `/admin/security`.
- Done when: signed-in QA admin sees only the intended organization data across all admin surfaces and screenshots are preserved.
- SaaS constants focus: tenant isolation, support/admin operations, audit logs, observability by tenant.
- Validation: hosted browser proof and `npm run qa:rls-proof`.

### LP-010 - Add Public Intake Abuse Controls

- Priority: P1 safety.
- Current state: public endpoints are intentionally unauthenticated but need throttling/abuse control.
- Seams: `/api/registration-requests`, `/api/mobile-usage-events`, Vercel/firewall config if used.
- Done when: burst requests are throttled or rejected, behavior is documented, and legitimate family signup/usage telemetry still works.
- SaaS constants focus: noisy-neighbor control, rate limits, tenant spoofing, public attack path, observability.
- Validation: route tests for accepted and throttled requests; `npm test`; `npm run typecheck`.

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
- Current state: intentionally disconnected.
- Seams: provider delivery service, Web Push VAPID, email/SMS provider adapters, provider webhooks, delivery attempts.
- Done when: approved attempts create real sandbox sends, rejected/suppressed attempts do not send, webhooks update delivery state, and retries are idempotent.
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
- Done when: launch either stays link-based or scopes Supabase Storage/private asset provider with upload review, file limits, scanning, deletion, and takedown policy.
- SaaS constants focus: file isolation, child privacy, storage paths, retention, support export/delete, abuse control.
- Validation: docs-only if deferred; storage/provider tests if implemented.

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
