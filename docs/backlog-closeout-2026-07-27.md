# Local Backlog Closeout Ledger

Date: 2026-07-27

Scope: LP-001 and the approved local closeout queue

Authority: this ledger is the canonical current-state index for the trackers linked below.

## State Contract

- `done-local`: committed implementation and repository tests/artifacts exist. This does not claim deployment, hosted execution, provider operation, or production acceptance.
- `external`: completion requires a hosted environment, provider control plane, production operator, or evidence that this repository cannot create by itself.
- `decision-required`: the safe default remains in force until an authorized product or commercial owner approves expansion.
- `decided`: an authorized MVP default is selected and closes the associated optional expansion from the active completion queue.
- `postponed`: retained future work that is explicitly not required for the current MVP definition of shipped.
- `paused`: intentionally preserved planning or isolated branch state; it is not executable until a fresh explicit resume instruction.
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
| LPM-009 / LPM-010 Sponsor Program persistence, fulfillment evidence, and payment-integrity correction | `done-local` | Sponsor Program migrations `20260819161500_sponsor_program_spine.sql`, `20260819190000_sponsor_fulfillment_evidence.sql`, and forward-only `20260820200000_sponsor_payment_integrity.sql`; focused domain, adapter, route, UI, migration, and verifier tests. PR #10 merged to remote `main` as squash commit `51c26de7def965cbca132794f0169bec50baa61a` after Production Smoke, Supabase Preview, Vercel, and Vercel Preview Comments passed at source head `b0b992e7371ef08c48d872f4850bf43deb95db43`. | The successful Supabase Preview check proves its CI migration job accepted the forward migration; it is not direct database readback, an executed cross-organization denial, Stripe sandbox settlement, finance reconciliation, hosted fulfillment acceptance, or production application/acceptance. Provider and payment gates remain disabled. |
| Production dependency audit | `done-local` | The final closeout branch reports `npm audit --omit=dev` clean. The full live registry audit reports 9 high-severity development-only findings through the upstream ESLint/minimatch/brace-expansion graph. | The only complete audit remediation offered is a breaking forced ESLint 10 change; it was not applied without compatibility work. Release automation must rerun both audit commands against the exact release commit. |

## MVP Completion Order - 2026-08-20

This is the active execution order. All other retained LP/LPM rows and external gates are postponed unless they are explicitly named here.

| Order | Work item | MVP completion condition |
| --- | --- | --- |
| 1 | LPM-020 hosted public-configuration contract | Expose only the irreversible organization fingerprint and configured review-window evidence; fail closed when either is missing or mismatched. No raw organization UUID, credential, secret, cookie, token, or client-side authority. |
| 2 | LP-005 registration approval and assigned-team activation | A signed-in organization admin approves or rejects a temporary registration; player, guardian, invitation, action, and audit rows read back correctly; private access activates only for the league/system-assigned team. No parent- or coach-selected team and no browser-return access grant. |
| 3 | LP-007 team-builder publication | A signed-in organization admin publishes the approved current plan in isolated QA; the plan, roster, and audit read back; stale or cross-organization writes fail. |
| 4 | LP-009 admin tenant scope | Every in-scope admin surface reads only the intended organization. Cross-organization roster, guardian, schedule, and export data are denied. |
| 5 | Security defect fixes | Fix the ICS export cross-tenant read, add the missing media-consent writer with explicit authority/audit, and correct weather-draft authorization. These are code defects, not acceptance gates. Chat read-receipt authorization and the chat-retention no-op are postponed. |
| 6 | LP-010 minimum public-intake abuse control | Use one shared-store counter or one edge rule for the internet-facing registration boundary so throttling survives multiple application instances. No broader abuse platform is required. |
| 7 | LP-003 / LP-004 link-media moderation contraction | With `DEC-MEDIA` fixed to link-only, retain one authorized hide/restore toggle and prove family/team reads honor it. Upload, storage, scanner, parent-report, and destructive-remove expansion are not MVP requirements. |
| 8 | EXT-HOSTED-SESSION | Definition of shipped: exact deployed commit/environment, ordered migrations applied and read back, target identity proven, and signed-in parent/coach/admin core journeys passing against the intended isolated hosted tenant. |

## Paused Planning Inventory

These items are retained so they cannot disappear from the LeaguePilot backlog. They are not part of the executable priority queue.

| Work item | State | Safekeeping record | Resume boundary |
| --- | --- | --- | --- |
| Sponsor Outcome Graph | `paused` | Isolated worktree `/home/administrator/projects/leaguepilot-sponsor-outcome-graph-20260819`; branch `codex/sponsor-outcome-graph-20260819`; base/head `2d7d1afb87a96b602885607632b25ba32092b62f`. The intended direction is admin-first, privacy-safe, and causal-ready. | Do not edit, rebase, merge, publish, or delete the worktree/branch without a fresh explicit resume instruction. No Sponsor Outcome Graph implementation or acceptance is claimed here. |
| AI-assisted full-season setup | `paused` | Planning-only proposal for guided chat plus file intake across `/admin/teams` and `/admin/imports`, followed by one organization-admin approval before apply. | Requires explicit implementation authorization. AI remains advisory; it may draft, map, and validate, but it may not autonomously create child access, send invitations/messages, weaken retention/privacy controls, or apply season changes. |

## Remaining Acceptance Ledger

Each open gate is listed once here. Other trackers link to its gate ID rather than redefining completion.

| Gate | State | Owner / authority | Concrete acceptance requirement |
| --- | --- | --- | --- |
| EXT-HOSTED-SESSION | `external` | Release owner with an isolated QA deployment and QA Supabase authority | This is the current definition of shipped. Install and read back the complete ordered migration chain on an explicitly identified isolated QA project, deploy the intended commit to a separately identified QA/Preview app, pass target-identity preflight, then run signed-in parent/coach/admin core journeys and readback without targeting a production alias. |
| EXT-PRODUCTION-READONLY | `external` | Production release owner | Create and run a separately named read-only production acceptance harness. It may inspect role/session reachability and scoped reads but must not seed, write, acknowledge, publish, or clean up production data. |
| EXT-REALTIME | `external` | Supabase project owner | On an isolated QA target, execute the guarded Realtime harness and preserve authorized delivery, wrong-team/cross-org absence, disconnect/reconnect, version-deduplication, and exact cleanup evidence. |
| EXT-RLS-ACTOR-ACTION | `external` | Supabase security owner | On an isolated QA target, execute the guarded actor/action matrix, review the remaining overlapping permissive policies semantically, and preserve allow/deny/readback/cleanup evidence. |
| EXT-BACKUP-RESTORE | `external` | Supabase production owner | Enable or explicitly accept the backup/PITR posture, document RPO/RTO, capture a current backup after the promoted schema, and complete a non-production restore drill with integrity/readback evidence. |
| EXT-PREVIEW-AUTH | `external` | Vercel project owner | Provide a scoped automation bypass for the named Preview deployment, or another approved non-production access path, and prove the exact deployment/alias before browser automation. Production promotion is not a substitute for mutating QA proof. |
| EXT-PROVIDER-SENDS | `postponed` | Product safety owner plus email/SMS/Web Push provider owners | Not required for MVP under `DEC-PROVIDER`: records remain draft/internal only. Reopening requires a new explicit channel decision plus consent, allowlist, sandbox, suppression, retry, webhook, delivery-log, cost, and monitoring proof. |
| EXT-WEATHER | `postponed` | Weather-provider and release owners | Hosted provider credentials, fallback, and parent delivery are not required for MVP under `DEC-PROVIDER`. The weather-draft authorization defect remains active and provider-free. |
| EXT-STORAGE | `postponed` | Storage/security owner | Not required for MVP under `DEC-MEDIA`: media remains link-only. Reopening requires a new explicit storage decision plus private paths/RLS, limits, scanning, consent, moderation/release, retention/deletion, and takedown proof. |
| EXT-BILLING | `postponed` | Commercial owner plus Stripe/account owner | Not required for MVP under `DEC-BILLING`: sponsor billing remains proof-only. Reopening collection requires a new explicit decision and the retained Stripe sandbox, webhook, replay, refund/dispute, readback, finance, and hosted proof. |
| EXT-SPONSOR-FULFILLMENT | `postponed` | Commercial owner plus hosted QA, storage, and communications owners | Not required for MVP under `DEC-BILLING`. Hosted sponsor placement, asset, recap/report, renewal, finance, and production acceptance remain retained future work. |
| EXT-PRODUCTION-RELEASE | `external` | Production release owner | Rerun typecheck, tests, build, production and full dependency audits, read-only production acceptance, environment/secret-shape checks, monitoring, rollback, and the applicable external gates against the exact release commit. |
| DEC-PROVIDER | `decided` | Product safety/commercial owner | MVP is draft/internal records only. Live email, SMS, and Web Push are not required; `EXT-PROVIDER-SENDS` and hosted weather-provider delivery are postponed. |
| DEC-MEDIA | `decided` | Product/privacy owner | MVP is link-only media. `EXT-STORAGE` is postponed; LP-003/LP-004 contract to one authorized hide/restore toggle. |
| DEC-BILLING | `decided` | Commercial/finance owner | MVP sponsor billing is proof-only. `EXT-BILLING` and `EXT-SPONSOR-FULFILLMENT` are postponed and sponsor work is removed from the active MVP queue. |
| DEC-MOBILE | `decided` | Product owner | MVP is PWA-first. Native/Expo and app-store acceptance are not required for MVP. |
| DEC-PREVIEW-OPENAI | `decided` | AI/product and Vercel environment owners | Preview OpenAI is disabled for MVP. No Preview provider environment or proof is required. |

## Retired Production-Mutation Instructions

Historical repository evidence records that earlier versions of `qa:session-proof`, Communication Room record proof, and related browser scripts were run against the production alias. Those dated results remain historical evidence only.

After LP-QA-GUARD-001:

- `qa:session-proof`, `qa:communication-room-record-proof`, demo seeding, and any other script that writes or cleans up rows are isolated-QA-only;
- the protected production Supabase project and `leaguepilot.us` / `www.leaguepilot.us` application hosts are rejected by the shared guard;
- production acceptance must use the future `EXT-PRODUCTION-READONLY` harness, not a renamed invocation of a mutating script;
- no current document authorizes production seeding, live-action proof, Communication Room replies/acknowledgments, or cleanup.

## Historical Evidence Boundary

Prior hosted URLs, deployment IDs, screenshots, and dated audit totals in `docs/build-progress.md` and `docs/production-audit-action-items.md` describe what was observed at that time. They do not prove the current commit, current environment, provider operation, or production acceptance. The original `docs/backlog-now.md` and `docs/backlog-next.md` checklists are retired planning history.
