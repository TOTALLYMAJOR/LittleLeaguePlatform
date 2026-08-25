---
authority: active
answers: external-gates
supersedes: [docs/backlog-now.md, docs/backlog-next.md, docs/feature-fit-backlog.md]
superseded_by: null
reviewed: 2026-08-22
---
# Local Backlog Closeout Ledger

Date: 2026-07-27

Scope: LP-001 and the approved local closeout queue

Authority: this ledger is the canonical current-state index for the trackers linked below.

## State Contract

- `done-local`: committed implementation and repository tests/artifacts exist. This does not claim deployment, hosted execution, provider operation, or production acceptance.
- `external`: completion requires a hosted environment, provider control plane, production operator, or evidence that this repository cannot create by itself.
- `decision-required`: the safe default remains in force until an authorized product or commercial owner approves expansion.
- `historical`: retained evidence or superseded planning context; it is not a current run instruction.

## Closed Local Queue

| Work item | State | Exact committed evidence | Boundary retained |
| --- | --- | --- | --- |
| LP-001 / LP-DOCS-001 product-truth reconciliation | `done-local` | This ledger and the linked tracker updates; `git diff --check` is the declared validation. | Documentation closeout does not supply hosted or production acceptance. |
| LP-007 local portion: team-builder preview/edit/approve/publish | `done-local` | `components/team-builder-workbench.test.tsx`; `app/api-team-builder.test.ts`; `lib/supabase/team-builder-inputs.test.ts`; `lib/supabase/team-builder-plans.test.ts`; `supabase/team-builder-production.test.ts`; migration `20260727145702_complete_private_team_builder_publish.sql`. The committed contract includes tenant-safe fingerprint-bound idempotency, atomic private-input auditing, exact approved/current roster-set revalidation, and a same-count roster-swap regression test. | Signed-in hosted admin browser publication, migration application, PostgreSQL execution, and connected-project RLS/readback remain external. |
| LP-008 local portion: private production inputs | `done-local` | `lib/domain/season-planning.ts`; `lib/domain/domain.test.ts`; `lib/supabase/team-builder-inputs.ts`; migration `20260727145702_complete_private_team_builder_publish.sql`. | Birthdate/age-band/evaluation inputs remain private admin planning data; no parent or public child detail was added. |
| LP-OFFLINE-001 actor-bound offline/reconnect | `done-local` | `lib/offline/game-day-outbox.test.ts`; `components/offline-sync-status.test.tsx`; `components/ui/AppShell.test.tsx`; `public/sw.js`; `/offline`. The IndexedDB adapter contract is exercised with `fake-indexeddb` for atomic suppression, actor fencing, clearing, expiry, clone behavior, and receipt reuse. | Server and organization flags remain off by default; hosted reconnect/conflict and multi-actor browser proof remain external. The adapter test is spec-compatible local evidence, not real-browser acceptance. |
| LP-QA-GUARD-001 QA target protection | `done-local` | `supabase/qa-target-guard.test.ts`; `app/api/qa-target-identity/route.test.ts`; `scripts/qa-target-guard.mjs`; guarded `scripts/verify-qa-session-paths.mjs`, `scripts/capture-communication-room-record-proof.mjs`, and `scripts/bootstrap-demo-tenant.mjs`. | Mutating harnesses are isolated-QA-only and reject the protected production Supabase project and canonical production host. |
| LP-RLS-PROOF-002 actor/action review harness | `done-local` | `supabase/rls-live-proof-harness.test.ts`; `scripts/verify-rls-actor-action-matrix.mjs`. The committed tests cover browser-granted family scope, cross-organization coach denial, plan redaction, credential separation, target guards, execution confirmation, and exact denied-insert cleanup. | The harness has not been executed here against a hosted target; the remaining permissive-policy actor/action acceptance is external. |
| LP-RLS-PROOF-002 Realtime harness | `done-local` | `supabase/rls-live-proof-harness.test.ts`; `scripts/verify-realtime-boundaries.mjs`. The plan covers authorized subscription/delivery, sibling and cross-organization absence, disconnect/reconnect, timestamp-normalized version deduplication, and failed-channel cleanup. | No hosted Realtime subscription/change-delivery run is claimed. |
| LP-LIFECYCLE-PROOF-001 guarded family lifecycle harness | `done-local` | `supabase/migration-gap-lifecycle-proof.test.ts`; `scripts/verify-migration-gap-lifecycle.mjs`. Cases cover competing transportation offers, caregiver expiry/cache clearing, official-communication correction/acknowledgment, media consent/retention, and multi-guardian season transition. | This is an isolated-target harness and local test contract, not hosted or production lifecycle execution. |
| Production dependency audit | `done-local` | The final closeout branch reports `npm audit --omit=dev` clean. The full live registry audit reports 9 high-severity development-only findings through the upstream ESLint/minimatch/brace-expansion graph. | The only complete audit remediation offered is a breaking forced ESLint 10 change; it was not applied without compatibility work. Release automation must rerun both audit commands against the exact release commit. |

## Remaining Acceptance Ledger

Each open gate is listed once here. Other trackers link to its gate ID rather than redefining completion.

| Gate | State | Owner / authority | Concrete acceptance requirement |
| --- | --- | --- | --- |
| EXT-HOSTED-SESSION | `external` | Release owner with an isolated QA deployment and QA Supabase authority | Install and read back the complete ordered migration chain on an explicitly identified isolated QA project, deploy the intended commit to a separately identified QA/Preview app, pass target-identity preflight, then run signed-in parent/coach/admin browser journeys and readback without targeting a production alias. |
| EXT-PRODUCTION-READONLY | `external` | Production release owner | Create and run a separately named read-only production acceptance harness. It may inspect role/session reachability and scoped reads but must not seed, write, acknowledge, publish, or clean up production data. |
| EXT-REALTIME | `external` | Supabase project owner | On an isolated QA target, execute the guarded Realtime harness and preserve authorized delivery, wrong-team/cross-org absence, disconnect/reconnect, version-deduplication, and exact cleanup evidence. |
| EXT-RLS-ACTOR-ACTION | `external` | Supabase security owner | On an isolated QA target, execute the guarded actor/action matrix, review the remaining overlapping permissive policies semantically, and preserve allow/deny/readback/cleanup evidence. |
| EXT-BACKUP-RESTORE | `external` | Supabase production owner | Enable or explicitly accept the backup/PITR posture, document RPO/RTO, capture a current backup after the promoted schema, and complete a non-production restore drill with integrity/readback evidence. |
| EXT-PREVIEW-AUTH | `external` | Vercel project owner | Provide a scoped automation bypass for the named Preview deployment, or another approved non-production access path, and prove the exact deployment/alias before browser automation. Production promotion is not a substitute for mutating QA proof. |
| EXT-PROVIDER-SENDS | `external` | Product safety owner plus email/SMS/Web Push provider owners | If sends are approved, prove consent/preferences, recipient allowlist, human approval, sandbox execution, suppression, idempotent retry, verified webhooks, delivery logs, cost controls, and hosted monitoring. Until then, records remain draft/internal only. |
| EXT-WEATHER | `external` | Weather-provider and release owners | Prove hosted credential/fallback behavior and an authorized draft action without parent delivery. |
| EXT-STORAGE | `external` | Storage/security owner | If private uploads are approved, prove tenant-scoped private object paths/RLS, file limits, scan adapter, consent, moderation/release, retention/deletion, takedown, and hosted family visibility. |
| EXT-BILLING | `external` | Commercial owner plus Stripe/account owner | If collection is approved, prove connected-account ownership, test-mode Checkout, signed replay-safe webhooks, payment-state readback, failure/refund/dispute handling, restricted keys, and hosted behavior. Browser return alone is not payment proof. |
| EXT-PRODUCTION-RELEASE | `external` | Production release owner | Rerun typecheck, tests, build, production and full dependency audits, read-only production acceptance, environment/secret-shape checks, monitoring, rollback, and the applicable external gates against the exact release commit. |
| DEC-PROVIDER | `decision-required` | Product safety/commercial owner | Current default is draft/internal provider records only. Approve a named channel and operating policy before EXT-PROVIDER-SENDS may start. |
| DEC-MEDIA | `decision-required` | Product/privacy owner | Current default is link-only media. Approve private upload/storage scope before EXT-STORAGE may start. |
| DEC-BILLING | `decision-required` | Commercial/finance owner | Current default is sponsor proof-only billing. Approve real collection and accounting ownership before EXT-BILLING may start. |
| DEC-MOBILE | `decision-required` | Product owner | Current default is PWA-first. Approve native Expo only from measured need for app-store distribution, native push, camera/media, or OS integration. |
| DEC-PREVIEW-OPENAI | `decision-required` | AI/product and Vercel environment owners | Preview OpenAI remains out of scope. Name a non-production Preview branch/tenant and secret policy before adding provider variables there. |

## Retired Production-Mutation Instructions

Historical repository evidence records that earlier versions of `qa:session-proof`, Communication Room record proof, and related browser scripts were run against the production alias. Those dated results remain historical evidence only.

After LP-QA-GUARD-001:

- `qa:session-proof`, `qa:communication-room-record-proof`, demo seeding, and any other script that writes or cleans up rows are isolated-QA-only;
- the protected production Supabase project and `leaguepilot.us` / `www.leaguepilot.us` application hosts are rejected by the shared guard;
- production acceptance must use the future `EXT-PRODUCTION-READONLY` harness, not a renamed invocation of a mutating script;
- no current document authorizes production seeding, live-action proof, Communication Room replies/acknowledgments, or cleanup.

## Historical Evidence Boundary

Prior hosted URLs, deployment IDs, screenshots, and dated audit totals in `docs/build-progress.md` and `docs/production-audit-action-items.md` describe what was observed at that time. They do not prove the current commit, current environment, provider operation, or production acceptance. The original `docs/backlog-now.md` and `docs/backlog-next.md` checklists are retired planning history.
