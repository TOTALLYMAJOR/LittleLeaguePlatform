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
- Status: Local implementation is committed. Migrations through `0024` plus `20260724143554_security_definer_execution_hardening.sql`, real-session RLS, multi-child Communication Room persistence, acknowledgment audit readback, and zero-provider-send behavior were proven in an isolated Supabase QA project. The active LeaguePilot production project was not changed. Provider sends, family-visible uploaded media, and payment collection remain disabled by default.
- Current state: authenticated context is server-derived; operational summaries use independent evidence/freshness lanes; RSVP and attendance use idempotency plus record/schedule versions; Parent Replay separates draft/approval/publication; provider acceptance/delivery/read/acknowledgment are independent; media is quarantined until scan/consent/release; Family Balance uses payment evidence instead of inferred seed charges; admin archive requires a recomputed impact preview and audit.
- Feature gates: offline replay needs `NEXT_PUBLIC_OFFLINE_WRITES_ENABLED`, `OFFLINE_WRITES_ENABLED`, and `organizations.offline_writes_enabled`. Provider sends, media uploads, and payments each need their server kill switch plus organization flag. Media additionally needs a proven scan adapter; payment confirmation additionally needs a verified Stripe webhook.
- Rollback: disable the environment switch or organization flag. Existing records remain; the affected surface returns to online-only, draft-only, quarantine/proof-only, or link-only behavior without deleting evidence.
- Proof queue: promote migrations only after an explicit production approval; repeat signed-in hosted role/browser proof; run concurrency and offline conflict journeys for remaining coordination flows; then promote provider, media, and payment slices individually through allowlisted sandbox and hosted proof.
- Prompt workflow: `docs/prompt-evolution-timeline.md` and `tools/prompt-api/` encode the four-system prompt patterns. `npm run codex:spec` and `npm run codex:debug` print prompts only.
- Validation: `npm run check:skills`; `npm run typecheck`; `npm test`; `npm run build`; `npm audit`; `npm run qa:rls-proof`; role-browser screenshots at 375, 390, 768, and 1440.

### Active Goal - Approved Family Experience Execution

- Priority: P0 public trust, family access, and five-second logistics clarity.
- Governing contract: `docs/family-experience-blueprint.md` and the approved Figma frames linked from that document.
- Commit policy: implement, validate, and commit one coherent slice at a time. If an external provider, hosted environment, production promotion, or missing product authority blocks a slice, record the exact blocker and continue to the next safe slice.
- Current completed slices: Communication Room local implementation, responsive proof, isolated Supabase QA record proof, privileged RPC hardening, provider-suppressed acknowledgment evidence, and Phase 0 public trust corrections with responsive browser proof.
- Current next slice: Phase 2 Family Mission Control.
- Supabase promotion snapshot (2026-07-24): the connected LeaguePilot project exposes only its main branch and migration history through `0021`. Do not skip directly to `0025`-`0027`; promote `0022` onward in order only after explicit production approval. The current security advisor still reports [legacy mutation/maintenance `SECURITY DEFINER` exposure](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [mutable helper search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) that the unpromoted `20260724143554_security_definer_execution_hardening.sql` migration is designed to correct. The remaining helper-function advisor notices require policy-aware review because RLS predicates intentionally execute for Data API roles. [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) is also disabled and remains a hosted Auth configuration gate.

| Family phase | Current status | Remaining outcome |
| --- | --- | --- |
| Phase 0 - Public trust corrections | Local implementation and 320/390/768/1440 browser proof complete; hosted proof pending | Configure `PUBLIC_ORGANIZATION_ID` and `PUBLIC_ACCESS_REVIEW_WINDOW` in the target environment, deploy, and repeat `npm run qa:public-family-proof` against the hosted URL. Public routes now use access-first CTAs, empty production forms, an agenda-first schedule, provider calendar actions, signed-in-value-gated installation, and a tangible privacy-safe Parent Replay preview. |
| Phase 1 - Access and activation | Local implementation complete: request receipt/timeline, privacy-minimized status/recovery, atomic first-sign-in preferences, one-time identity-matched acceptance, and additional-guardian proposal/admin review/manual issuance/revocation | Apply and prove migrations `0025`-`0027` in isolated QA, then run signed-in cross-family RLS and responsive browser proof. Provider delivery and legacy approval-created token issuance remain external gates. Existing request status remains `pending`, `approved`, or `rejected`; no slice silently sends a provider message or expands approved child/team scope. |
| Phase 2 - Family Mission Control | Local dashboard, RSVP, schedule, Family Flight Plan, and Communication Room foundations | Five-second Event Passport, coherent multi-child conflict handling, offline/reconnect truth, production-hosted proof. |
| Phase 3 - Responsibility and temporary care | Caregiver handoff coordination record exists; authority workflow queued | Transportation offer and dual acceptance, outbound/return responsibility, time-bound caregiver access, restriction-aware expiry and revocation. |
| Phase 4 - Priority communication and disruption | Communication Room proof complete in isolated QA; disruption foundations local | Durable message versions/corrections/withdrawals, one-revision projection fan-out, provider sandbox evidence, propagation monitoring and reversible correction. |
| Phase 5 - Parent Replay and season continuity | Coach-reviewed Replay foundations local | Family story and memory timeline, consent-aware media, season/team transition review, privacy-minimized administrator readiness analysis. |

### Active Goal - Tenant Onboarding Readiness Lane

- Priority: P0 tenant readiness.
- Status: Local implementation and proof complete. Production tenant-readiness proof passed against `https://www.leaguepilot.us` on 2026-07-18; latest-preview proof is still blocked by Vercel Authentication until a bypass secret is configured or the deployment is explicitly promoted to Production.
- Current state: Slices 1 through 4 are implemented. `/admin/health` now loads tenant readiness from Supabase rows scoped to the signed-in organization admin and shows whether each organization has an active season, active teams, coach coverage, rostered players, family access path, scheduled events, and a provider-send boundary before inviting families. `/admin/teams` now gives admins a tenant setup guide, new season/team/player reset actions, and explicit empty-state blocking copy. `npm run qa:tenant-readiness-proof` signs in the QA admin, proves `/admin/health` plus `/admin/teams`, and captures screenshots under `output/playwright/tenant-readiness/`. `npm run qa:demo-tenant-proof` proves the fictional demo tenant with DEMO admin, coach, and parent sessions, Supabase readback, delivery-attempt metadata, zero provider sends, and screenshots under `output/playwright/demo-tenant/`.
- Blockers carried forward: the latest preview deployment cannot be browser-proven while Vercel Authentication blocks unauthenticated QA automation; Supabase Auth raw-signup email quota/SMTP capacity must not be the only tenant-admin onboarding path; live email/SMS/Web Push sends remain disconnected until the approved provider-send worker/adapters/webhooks slice is implemented and proven.
- Next slices: either configure a Vercel automation bypass for preview proof or explicitly promote the current preview to Production, rerun `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:tenant-readiness-proof`, then resume the P1 proof queue starting with media report/moderation, registration approval, and team-builder publish browser proof.
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
- Current state: registration approval and guardian-link repair now require an active organization-admin reviewer, an existing parent profile, and bounded verification evidence; an existing profile email match remains only a correlation signal, while unmatched parents stay invited. Hosted/browser proof and any stronger identity-verification provider remain open.
- Seams: `/admin/registrations`, `/admin/guardian-links`, registration approval RPCs, guardian repair API, `docs/privacy-security.md`.
- Done when: docs and tests define what evidence is enough to link a parent to a child/team and what remains admin-reviewed. Local policy is covered; hosted migration/RLS proof and any stronger identity evidence remain follow-up work.
- SaaS constants focus: identity, authorization, child privacy, support repair, auditability, failure semantics.
- Validation: `lib/supabase/registration-approvals.test.ts`; `supabase/rls-policy.test.ts`; hosted migration/RLS proof for production closure.

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
- Current state: intentionally disconnected. The configured Supabase project now has `notification_delivery_attempts` execution metadata from `0021_notification_delivery_execution.sql`, including `idempotency_key`, retry locks, retry counts, provider response JSON, webhook IDs, and `dead_lettered_at`. The fictional demo tenant seed and `npm run qa:demo-tenant-proof` verify provider sends at zero and demo delivery-attempt rows carrying idempotency and dead-letter metadata. Live sends still require the approved worker/adapters/webhooks proof slice.
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
