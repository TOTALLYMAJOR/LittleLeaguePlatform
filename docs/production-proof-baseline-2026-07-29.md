# Production Proof Baseline - 2026-07-29

Status: LPM-001 local baseline finalized for AgentFlow attempt 3
Repository: LeaguePilot / Little League HQ
Build: `build_5e3e818d-6dc6-4069-8fc9-6498a727b3eb`
Task: `LPM-001`

This ledger fixes the production-proof boundary before later hosted, provider, payment, private-media, storage, or native slices begin. It uses the isolated AgentFlow task worktree as the local implementation authority and treats source checkout dirt, generated proof artifacts, `.history`, and preserved AgentFlow task worktrees as outside this slice.

## Repository Baseline

| Field | Current value |
| --- | --- |
| Observed working directory | `/home/administrator/.agentflow/worktrees/repo_80ec8817-7c48-4066-a53c-6a5aa57d31c8/build_5e3e818d-6dc6-4069-8fc9-6498a727b3eb/tasks/task_lpm-001_771e7704-f2bc-449a-9838-e21112a17673` |
| Git top level | `/home/administrator/.agentflow/worktrees/repo_80ec8817-7c48-4066-a53c-6a5aa57d31c8/build_5e3e818d-6dc6-4069-8fc9-6498a727b3eb/tasks/task_lpm-001_771e7704-f2bc-449a-9838-e21112a17673` |
| Current branch | `agent/build_5e3e818d-6dc6-4069-8fc9-6498a727b3eb/task_lpm-001_771e7704-f2bc-449a-9838-e21112a17673` |
| Current HEAD at attempt-3 start | `8ec64bd58c08572199a3703dbcf1fbe75941f3c4` |
| Upstream | None configured for the AgentFlow task branch (`git rev-parse --abbrev-ref --symbolic-full-name @{u}` exits 128) |
| Attempt-3 pre-final status | Clean task worktree at `8ec64bd58c08572199a3703dbcf1fbe75941f3c4` before this documentation patch (`git status --short --branch` showed only the branch header). |
| Attempt-3 final worker status | Owned documentation modifications only: `M docs/missing-production-slices-work-plan.md` and `M docs/production-proof-baseline-2026-07-29.md`. |
| Owned files | `docs/exceptional-ux-acceptance-audit.md`, `docs/missing-production-slices-work-plan.md`, `docs/production-proof-baseline-2026-07-29.md`, `docs/production-task-board.md` |

## Dirty-Tree And AgentFlow Caveats

- The source checkout boundary is preserved. The task context identifies unrelated parent dashboard source edits, generated Playwright output, `.history`, and preserved AgentFlow task worktrees as not part of LPM-001.
- This worker did not inspect, repair, move, delete, or publish any source checkout or AgentFlow-managed worktree outside the current task directory.
- AgentFlow owns Git history, integration validation, Docker execution, durable run state, worktree cleanup, publication, and acceptance. This ledger is local documentation evidence only until AgentFlow integrates and validates it.
- The prior work-plan execution log referenced `/home/administrator/projects/youth-sports-platform-mvp-v3` and branch `codex/ui-ux-100-shell-chat`. Those entries remain historical source-checkout context, not the current task branch identity.
- Attempt 1 failed during validation before integration. Attempt 2 produced result commit `8ec64bd58c08572199a3703dbcf1fbe75941f3c4` but failed AgentFlow integration validation with `sh: 1: next: not found`; AgentFlow, not this worker, owns that integration environment and any cleanup. Attempt 3 starts from that result commit and keeps work scoped to the four owned docs.

## Proof Boundary

| Boundary | What is locally established | What is not established |
| --- | --- | --- |
| Local implementation | The Next.js/Supabase scaffold, route guards, provider-boundary tests, route topology, docs, and local build can be checked in this isolated worktree. | Local checks do not prove hosted environment variables, signed-in hosted browser journeys, production Supabase state, provider callbacks, payment settlement, private storage, backups, Realtime delivery, or native distribution. |
| Hosted verification | Requires a named hosted base URL, configured environment variables, QA identities, and browser/API proof against that deployment. | Not performed by LPM-001. No hosted mutations, preview bypass changes, deployments, or production browser proof were attempted. |
| Provider operation | Requires explicit allowlisted sandbox recipients, provider secrets scoped to the approved environment, callback reachability, signed webhook replay, delivery reconciliation, suppression, cost controls, and rollback. | Live email, SMS, Web Push, AI publish/send, and notification-provider sends remain unproven and disabled unless a later gated slice approves them. |
| Payment operation | Requires a product decision, Stripe sandbox configuration, restricted server-side keys where possible, Checkout Session creation, signature-verified webhooks, idempotent settlement, and accounting/reporting proof. | No live or sandbox Stripe collection, settlement, invoice payment truth, refund, or payout proof is complete. Browser return is not payment proof. |
| Private media/storage | Requires storage-provider decision, tenant-scoped object paths, upload gate, scan adapter, EXIF stripping, moderation, guardian consent/revocation, quarantine, deletion/export, and hosted RLS proof. | Private upload/release/scanning/storage is not production-enabled. Existing media evidence remains link/report/moderation or gated private-media scaffolding, not complete storage proof. |
| Production acceptance | Requires hosted role/browser proof, production RLS and lifecycle proof, backup/PITR/restore acceptance, Realtime subscription/change proof, provider/payment/media gates where used, monitoring, rollback, and business approval. | LPM-001 is not production acceptance and does not authorize launch, provider sends, payment collection, private uploads, migrations, production mutations, or deployment. |

## Current Open Remote Gates

| Gate | Current baseline |
| --- | --- |
| RLS proof | `npm run qa:rls-proof` exists and is required for isolated QA RLS proof, but it was not run in LPM-001 because no isolated QA target was configured and confirmed for this worker. |
| Realtime | Production Realtime authorization, reconnect, and change-delivery proof remain open. Control-plane health alone is not subscription proof. |
| Backup/PITR/restore | Backup/PITR/restore acceptance remains open. Prior migration notes say PITR was disabled and no restore drill was proven. |
| Hosted role browser proof | Broader signed-in hosted parent, coach, admin, caregiver, media, sponsor, season-transition, and cross-tenant lifecycle proof remains open. |
| Provider sends | Live email, SMS, Web Push, and provider-send webhooks remain gated behind LPM-007. Provider records/drafts are not delivery. |
| Stripe/payment | Sponsor billing remains proof-only unless LPM-009 approves and proves Stripe sandbox collection and webhook settlement. |
| Private media | Private media upload, scanning, storage RLS, release, revocation, deletion, and retention proof remain gated behind LPM-008. |
| Native app | Expo/native app distribution remains a product decision after hosted PWA/mobile proof under LPM-012. |

## RLS QA Command Inputs

`npm run qa:rls-proof` maps to `node scripts/verify-rls-boundaries.mjs`. For a hosted QA target, the command requires all of the following and must not target protected production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `QA_PARENT_EMAIL`
- `QA_PARENT_PASSWORD`
- `QA_COACH_EMAIL`
- `QA_COACH_PASSWORD`
- `SUPABASE_QA_TARGET_REF`
- `SUPABASE_QA_PARENT_PROJECT_REF=dkwghvvlbdnnwzbnscvu`
- `SUPABASE_QA_TARGET_CONFIRM=seed-isolated-qa-target`

The guard allows localhost targets without hosted confirmation, but a hosted run must use HTTPS, the URL project ref must equal `SUPABASE_QA_TARGET_REF`, and the target must differ from protected production `dkwghvvlbdnnwzbnscvu`.

## Validation Ledger

| Command | LPM-001 result |
| --- | --- |
| `npm run check:skills` | Passed in this worker. |
| `npx vitest run app/route-guards.test.ts app/routes-smoke.test.ts app/provider-boundary.test.ts lib/navigation/route-topology.test.ts` | Passed in this worker: 4 test files, 43 tests. |
| `npm run typecheck` | Passed in this worker. |
| `npm run build` | Passed in this worker. Attempt 2's external AgentFlow integration blocker was `sh: 1: next: not found`, but this attempt observed `node_modules/.bin/next` present before rerunning the build. |
| `git diff --check` | Passed in this worker after the final documentation patch. |
| `npm run qa:rls-proof` | Skipped by design; no isolated QA target and confirmation were configured for this worker. |

## Governing Inventory

`docs/missing-production-slices-work-plan.md` remains the dependency-ordered task inventory for LPM-001 through LPM-012. Local documentation and repository validation can close LPM-001. Later slices must stay split by proof type:

- Locally executable: documentation alignment, route/provider/navigation tests, typecheck, build, and whitespace validation.
- Hosted-gated: public family proof, tenant readiness, signed-in role browser proof, cross-tenant lifecycle proof, hosted RLS proof.
- Provider-gated: email, SMS, Web Push, weather/provider actions, signed webhooks, delivery reconciliation.
- Payment-gated: Stripe product decision, sandbox Checkout, signature-verified webhooks, settlement truth.
- Media/storage-gated: private object storage, upload initiation, scanner, consent, revocation, deletion, retention.
- Product-decision-gated: sponsor collection scope and native app distribution.

## No-Action Record

During LPM-001 this worker did not run provider sends, hosted mutations, production mutations, deployments, migrations, Docker, Docker Compose, Git history operations, Stripe actions, private media uploads, native app work, or AgentFlow cleanup.
