# Runbook

Current proof boundary (2026-07-27): use [`docs/backlog-closeout-2026-07-27.md`](backlog-closeout-2026-07-27.md) for the canonical local/external/decision/historical split. Mutating QA scripts are isolated-QA-only after LP-QA-GUARD-001. No command here authorizes writes, seeding, acknowledgment, provider calls, or cleanup against the production alias.

## Local Next.js Run

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000/`.

## Docker Run

Start:

```bash
docker compose up -d --build
```

Check:

```bash
curl -I http://localhost:8081/
docker compose ps
```

Stop:

```bash
docker compose down
```

## Make Targets

```bash
make install
make dev
make build
make test
make validate
make up
make down
make restart
make logs
make smoke
```

## Verification

```bash
npm run typecheck
npm test
npm run build
npm audit
docker compose up -d --build
curl -fsSI http://localhost:8081/
```

## Local Readiness Completion Ledger

Run the no-mutation ledger before any external proof, hosted run, provider sandbox, payment, storage, browser, analytics, app-store, backup/restore, accessibility, deploy, or production-acceptance lane:

```bash
npm run qa:local-readiness-ledger
```

The AgentFlow missing-production sequence is locally complete through LPM-012 as local repository readiness proof only. LPM-002 through LPM-012 are reconciled as `local repository readiness complete - external proof open`; this is not end-to-end `done` and does not close hosted, Supabase, RLS, provider, Stripe, storage/scanner, sponsor, archive/restore, native/app-store, accessibility, or production acceptance. LPM-013A is a ledger/verifier only; it reads repository files, checks the AgentFlow queue, package scripts, verifier tests, and governing docs, then prints named blockers when the local sequence is incomplete, inconsistent, or overstated. The continued-execution invariant is that continued one-task-at-a-time execution accepts exactly one executable queue heading, either LPM-013A or LPM-014 or later; LPM-001 through LPM-012 remain completed records only and their A-variants must not be re-executed. LPM-018 is integrated in AgentFlow build `build_faa1c28e-cc9d-4912-9529-0df1240963da` at integration commit `50e56d2d33cd04dc869483a1f99b6583fd9cc36b`; external proof and production acceptance remain separate authorized follow-up lanes.

- Protected source checkout boundary: `/home/administrator/projects/youth-sports-platform-mvp-v3`.
- Clean AgentFlow execution checkout: `/home/administrator/projects/leaguepilot-missing-production-agentflow-20260729`.
- Both checkout rule: both checkout states must be re-read before every task.
- no-push/no-deploy/no-provider/no-production-mutation boundary: the ledger does not push, deploy, call providers, configure secrets, seed, mutate hosted records, upload or download media, collect analytics, run browser proof, run archive close, or claim production acceptance.
- Final integration commit through LPM-018: `50e56d2d33cd04dc869483a1f99b6583fd9cc36b`. This is historical integration evidence through LPM-018, not the queue commit and not a future final HEAD.
- Open external gate families after LPM-012: hosted browser proof open; Supabase readback open; RLS open; provider sandbox/webhooks open; Stripe settlement open; private media storage/scanner open; sponsor rendering/report/finance open; archive retention/restore open; native/app-store open; accessibility open; production acceptance open.

## Local Access Lifecycle Authority Proof

Run the no-mutation source verifier before hosted LPM-003 browser proof:

```bash
npm run qa:access-lifecycle-authority
```

The verifier reads repository files only. It checks that registration review, parent invite preview/acceptance, guardian-link repair, and additional-guardian review remain session-derived, review-gated, scope-bounded, audited where consequential, and provider-free. It does not call Supabase, sign in, run Playwright, seed data, send providers, deploy, mutate hosted records, or establish hosted acceptance. Passing this command only proves the local source authority contract; hosted UI proof and Supabase readback remain separate open gates.

## Local Game-Day Communication Readiness Proof

Run the no-mutation source verifier before hosted LPM-005 browser and Supabase readback proof:

```bash
npm run qa:game-day-communication-readiness
```

The verifier reads repository files only. It checks that game-day resolution routes derive the actor from `requireAuthenticatedRouteUser`, keep the bounded monitor/confirm/delay/cancel decision set, forward idempotency, and rely on assigned-coach or organization-admin service/RPC authority. It also checks event/schedule-version evidence, durable review/audit rows, pending-only recipient records, official publish/correction/withdrawal version binding, immutable official versions, current-version family readback, projection counts, correction history, acknowledgment boundaries, and offline/reconnect conflict seams. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, create provider sends, deploy, configure realtime/provider infrastructure, or establish hosted acceptance.

Passing this command proves only the local repository readiness contract. Hosted browser proof, Supabase readback, populated one-version family projection, provider sandbox/webhook proof, realtime/offline production behavior, and production acceptance remain open gates.

## Local Family Season Continuity Readiness Proof

Run the no-mutation source verifier before hosted LPM-006 browser and Supabase readback proof:

```bash
npm run qa:family-season-continuity-readiness
```

The verifier reads repository files only. It checks that private Parent Replay reads require signed-in parent access, active guardian links, current child/team scope, queued published Replay status, first-name plus last-initial child labels, and draft/coach/admin leakage prevention. It also checks consent-aware media publication and read-time revocation/deletion suppression, private provider-free engagement, organization-admin season transition proposals, every-current-guardian review, lock-version and expiration gates, fixed carry-forward/reset fields, audit evidence, source-roster archival, provenance-linked target rows, downstream refusal, and service-only correction seams.

Passing this command proves only the local repository readiness contract. Hosted browser proof, Supabase readback, populated media consent/revocation proof, multi-guardian transition concurrency proof, storage/scanner proof, provider sandbox proof, and production acceptance remain open gates. The verifier does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, create provider sends, upload media, create storage objects, deploy, configure storage/scanner/realtime/provider infrastructure, or claim hosted acceptance.

## Local Private Media Storage Readiness Proof

Run the no-mutation source verifier before any LPM-008 private storage, scanner, consent, deletion, hosted, or production proof:

```bash
npm run qa:private-media-storage-readiness
```

The verifier reads repository files only. It checks that private media upload initiation and completion use authenticated route users, assigned coach or organization-admin authority, the `MEDIA_UPLOADS_ENABLED` server kill switch, the organization `media_uploads_enabled` flag, and proven scanner configuration before a signed storage token or scan path can succeed. It also checks organization/team quarantine object paths, allowed image extensions, quarantine-vs-family-visible copy, size/type/SHA-256/magic-byte evidence, image decode, rotation/re-encode with EXIF stripping, scanner endpoint/token/provider readiness, clean scan evidence id, processed-path writes, original quarantine removal before `scan_completed_at`, family release consent/moderation/accessibility requirements, family read suppression, retention/deletion evidence, reports, and moderation/takedown APIs.

Passing this command proves only the local repository readiness contract. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, upload media, create storage objects, download objects, call a scanner, call provider dashboards, configure secrets, deploy, or claim hosted, storage-provider, scanner-provider, or production acceptance. The remaining open gates are storage-provider setup, scanner-provider setup, hosted signed-upload proof, hosted scan proof, populated consent/revocation proof, deletion/retention proof, abuse/takedown proof, accessibility proof, and production acceptance.

## Local Provider Sandbox Readiness Proof

Run the no-mutation source verifier before any LPM-007 real provider sandbox proof:

```bash
npm run qa:provider-sandbox-readiness
```

The verifier reads repository files only. It checks that provider delivery review requires assigned-coach or organization-admin authority, provider/channel matching, organization feature gates, recipient preference checks, durable attempt rows, and no external send during review. It also checks that worker execution claims queued approved attempts, rechecks durable authority, binds attempt, notification, channel, provider, transport provider, idempotency key, retry count, and adapter selection before any adapter send can run.

Passing this command proves local repository readiness proof only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, send email, SMS, or Web Push, call SendGrid, Twilio, Pingram, Web Push, or provider dashboards, configure secrets, deploy, or claim sandbox, hosted, provider, or production acceptance.

Real sandbox email, SMS, and Web Push sends, provider dashboard setup, provider secrets, adult QA recipient approval, signed webhook endpoint registration, hosted worker execution, cost monitoring, and production-send approval remain open gates. Before any operator sends real sandbox traffic, document one adult-consented QA allowlist recipient per channel, a cost cap, monitoring owner, suppression rollback, and the rollback transport or kill-switch path.

## Local Weather Provider Readiness Proof

Run the no-mutation source verifier before any LP-016 hosted weather credential proof, signed-in draft proof, provider delivery proof, realtime/offline proof, accessibility proof, or production acceptance lane:

```bash
npm run qa:weather-provider-readiness
```

The verifier reads repository files only. It checks that the weather provider chain stays National Weather Service first, Open-Meteo fallback, and Tomorrow.io optional/premium; every provider result is forced back into draft alert state before persistence; the draft route derives reviewer authority from the authenticated Supabase session; and the Supabase seam keeps event/team scope, provider fallback, reviewer audit fields, idempotent/auditable draft creation boundary, and provider-send separation visible.

Passing this command proves local repository readiness proof only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, call weather providers, call provider dashboards, create provider sends, send email, SMS, push, or Stripe requests, configure secrets, deploy, or claim hosted, provider, or production acceptance.

Hosted weather credential proof, fallback behavior, signed-in coach/admin draft proof, Supabase readback, parent delivery, provider sandbox/webhook proof, realtime/offline behavior, accessibility, and production acceptance remain open gates.

## Local Native App Decision Readiness Proof

Run the no-mutation source verifier before any LPM-012 mobile browser, usage-metrics, push, offline/reconnect, native approval, Expo architecture, app-store, accessibility, or production-native proof:

```bash
npm run qa:native-app-decision-readiness
```

The verifier reads repository files only. It checks that LeaguePilot remains PWA-first, install promotion stays value-gated, standalone launches and install prompt outcomes are measured, `/api/mobile-usage-events` accepts native app interest as a telemetry signal without approval, public mobile telemetry remains rate-limited and anonymous-safe, the manifest/service worker/App Shell keep explicit bounded offline behavior, route-smoke/API tests cover the local wiring, and any future Expo/native path must reuse existing domain contracts, Supabase session/RLS boundaries, provider gates, and child privacy rules.

Passing `qa:native-app-decision-readiness` proves local repository readiness proof only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, collect real analytics, request push permissions, register app stores, scaffold Expo, send providers, upload media, deploy, configure secrets, or claim PWA/mobile browser, production usage, push-provider, app-store, native, or production acceptance.

The remaining open gates are mobile browser proof, production usage metrics review, push permission proof, offline/reconnect proof, native product approval, Expo architecture review, app-store compliance review, accessibility proof, and production native acceptance. Expo remains deferred until approved evidence shows the responsive PWA cannot satisfy the mobile requirement.

## Local Sponsor Stripe Readiness Proof

Run the no-mutation source verifier before any LPM-009 Stripe sandbox, webhook, hosted-admin, reconciliation, refund/failure, or production payment proof:

```bash
npm run qa:sponsor-stripe-readiness
```

The verifier reads repository files only. It checks that sponsor billing records, invoice readiness, payment-proof state, placement, fulfillment, and public display remain separate; proof-only status and browser return messages do not claim Stripe settlement; one-time sponsor collection uses server-side Checkout Sessions when enabled; Stripe keys stay server-side; missing Stripe configuration fails closed; and signature-verified webhooks remain the only settlement truth. It also checks that docs prefer restricted API keys, separate environments, and that no Stripe secret or restricted key values are stored in source.

Passing `qa:sponsor-stripe-readiness` is the LPM-009 local repository readiness completion gate for the existing proof-only versus sandbox boundary, server-side Checkout Session contract, server-only key handling, webhook settlement truth, admin/public privacy separation, and open payment gates. It is local repository readiness proof only. It does not call Stripe, Supabase, sign in, run Playwright, seed data, mutate hosted records, create Checkout Sessions, configure API keys or webhook secrets, register webhook endpoints, charge or refund payments, call provider dashboards, deploy, or claim sandbox, hosted, provider, finance, production payment, or production acceptance.

The remaining open gates are Stripe sandbox account setup, restricted key creation, webhook endpoint registration, signing-secret configuration, sandbox Checkout Session proof, signed webhook replay/duplicate proof, refund/failure proof, hosted admin proof, finance reconciliation, and production payment approval. Keep restricted API keys in environment-specific server secret storage with separate environments for sandbox/preview/production. No Stripe secret or restricted key values are stored in source.

## Local Sponsor Fulfillment Readiness Proof

Run the no-mutation source verifier before any LPM-010 hosted public/admin browser proof, placement rendering proof, logo asset proof, report proof, renewal delivery proof, or production sponsor acceptance:

```bash
npm run qa:sponsor-fulfillment-readiness
```

The verifier reads repository files only. It checks that public sponsor placement helpers filter active sponsors to approved placement keys, Team Portal placement stays team-scoped, admin sponsor saves reject invalid placement keys and cross-organization assignments, Supabase sponsor reads expose only approved logo assets, submitted logo URLs remain pending review inputs, unavailable sponsor data fails closed, Sponsor Hub and revenue summaries separate configured placement, reviewed logo metadata, billing/payment proof, renewal review, report export, delivered-placement proof, and unproven impact, renewal email remains human-reviewed and provider-disconnected, and public/parent surfaces avoid child, parent-contact, private media, billing, redemption, and sponsor-attributed impact leaks.

Passing this command is the LPM-010 local repository readiness completion gate for approved active placement filters, Team Portal scope, admin placement authority, approved logo reads, submitted-logo review queues, fail-closed sponsor data, fulfillment/report separation, renewal delivery gates, public and parent privacy, and open fulfillment gates. It proves local repository readiness only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, send renewal email, call email/SMS/push providers, call Stripe, create or refund payments, upload files, fetch external logo assets, call provider dashboards, deploy, or claim hosted, observed-rendering, provider, finance, accessibility, production, or production sponsor acceptance.

The remaining open gates are hosted public/admin browser proof, observed placement-rendering proof, approved logo asset proof, sponsor recap/report artifact proof, renewal email sandbox proof, public placement leak QA, accessibility proof, finance reconciliation, and production sponsor acceptance. Passing local readiness does not prove public placement actually rendered, that approved logo assets load from storage/CDN, that a recap/report artifact is acceptable, that renewal email sandbox delivery has consent and webhook proof, or that finance and production acceptance are complete.

## Supabase QA Proof

Use these checks only after selecting a local or explicitly isolated QA Supabase project and a matching non-production app:

```bash
npm run supabase:qa-users
npm run qa:rls-proof
npm run qa:session-proof
npm run qa:tenant-readiness-proof
npm run qa:demo-tenant-proof
npm run qa:brand-proof
npm run qa:coordination-proof
npm run qa:public-family-proof
```

Before any mutating proof, the shared target guard must verify that the Supabase project is not protected production, the app is not `leaguepilot.us` or `www.leaguepilot.us`, the hosted app URL exactly matches the invocation, and `/api/qa-target-identity` reports the expected non-production deployment class and project ref. Do not bypass these checks.

Migration `0024_coordination_loops.sql` adds the Season Launch commit/rollback RPCs, practice-run receipts, family caregiver handoffs, Game-Day Resolution receipts/RPC, and atomic notification acknowledgment. Before promotion, apply all migrations to a disposable empty PostgreSQL/Supabase database, then verify:

- a reviewed roster import can commit and safely roll back provenance-created rows;
- a completed practice receipt can be linked once to Parent Replay;
- a guardian handoff is limited to the linked player and same-team event;
- monitor/confirm/delay/cancel decisions require coach/admin authority and an action receipt;
- acknowledgment requires the intended recipient plus an existing delivery-attempt record.

Migration `0025_family_first_sign_in.sql` adds adult-owned language/privacy setup and an atomic service-only first-sign-in RPC. Before enabling the setup redirect in a hosted environment, prove that an active parent can save preferences, an unlinked account is rejected, notification rows remain scoped to the adult and team, an audit row is attributed, and zero provider sends occur. Missing `0025` intentionally leaves existing parents on `/parent`; it is not treated as completed setup.

Migration `0026_parent_invite_acceptance.sql` is in the promoted chain and adds one-time, identity-matched parent invitation acceptance. Feature acceptance still requires exact invited-email match, active-season and invited-guardian scope, replay rejection, wrong-account rejection, expiry/revocation behavior, audit attribution, and zero provider sends. It accepts a securely delivered secret; it does not issue or send one.

Migration `0027_additional_guardian_requests.sql` follows `0026` in the promoted chain and adds the human-reviewed additional-guardian path. Proposals require an active guardian link for exactly one child in an active season and do not alter access. Approval and rejection require an active organization administrator plus a bounded decision reason. No provider job is created or sent. The remaining lifecycle/RLS cases belong to the guarded isolated-QA acceptance gates.

Migration `0028_transportation_responsibility.sql` follows `0027` in the promoted chain and adds guardian-owned event transportation without upgrading legacy caregiver notes into authority. Requests and mutual acceptance are child/event/schedule-version scoped; restrictions fail closed; no home address or provider message is created. The committed lifecycle harness covers the local contract, while connected isolated-QA execution remains external.

Migration `0029_temporary_caregiver_authorizations.sql` follows `0028` in the promoted chain and adds one-child/team, selected-event, time-bound temporary care without guardian membership. Exact-email acceptance, hashed/rotated secrets, expiry/revocation, and private cache clearing fail closed. The committed lifecycle harness covers the local contract, while connected isolated-QA execution remains external.

The local empty-database migration and transactional workflow smoke proves SQL installation and behavior only. It does not replace real-session RLS, hosted route, provider sandbox, webhook, or production deployment proof.

`supabase:qa-users` creates or updates fictional QA users on the guarded target. `qa:rls-proof` signs in through the anon key and verifies role boundaries. `qa:session-proof` writes RSVP/preference/snack/volunteer and other fixture-backed actions and is therefore isolated-QA-only. `qa:tenant-readiness-proof`, `qa:demo-tenant-proof`, `qa:brand-proof`, and `qa:coordination-proof` likewise prove only the selected target and commit.

`qa:communication-room-record-proof` persists a fictional parent reply and acknowledgment, performs service-role readback, and cleans exact fixture state. It is isolated-QA-only. The shared guard rejects protected production and the canonical production host, requires explicit target identity, and preserves provider suppression. A missing schema capability is a failure, never inferred success.

`qa:public-family-proof` verifies signed-out Home, Schedule, Request Team Access, and Sign In at 320, 390, 768, and 1440 pixels. It checks CTA/copy contracts, empty forms, canonical-organization and current-team exposure, calendar-provider actions, value-gated installation, 44px controls, document overflow, and browser errors, then writes screenshots plus `proof.json` under `output/playwright/public-family-phase0/`. Set `PUBLIC_FAMILY_BASE_URL` for a non-default local or hosted target. Loopback and `.local` targets are classified as local and may run without hosted expectation variables. Hosted targets require `PUBLIC_ORGANIZATION_ID` and `PUBLIC_ACCESS_REVIEW_WINDOW`; after the LPM-020 code is deployed, the harness also verifies the rendered registration evidence matches the expected short SHA-256 organization fingerprint, proves the review-window configured state, and checks that the expected review-window copy rendered. `proof.json` records only the fingerprint and boolean/match results for this configuration proof, not the raw organization UUID or credentials. Local fallback organization selection is deterministic but is not a production configuration claim.

Before hosted public and tenant readiness browser proof, run the no-mutation hosted readiness preflight with the intended hosted URL, the target public organization configuration, the public access review-window copy, and QA admin command inputs:

```bash
QA_PROOF_BASE_URL=https://www.leaguepilot.us PUBLIC_ORGANIZATION_ID=<organization-uuid> PUBLIC_ACCESS_REVIEW_WINDOW='within two business days' NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> QA_ADMIN_EMAIL=<qa-admin@example.com> QA_ADMIN_PASSWORD=<qa-admin-password> npm run qa:hosted-readiness-preflight
```

The preflight only validates inputs and prints the follow-on proof commands. It does not deploy, bypass Vercel Authentication, seed Supabase, write hosted data, send providers, write payments, upload media, run migrations, or establish production acceptance. Passing it clears obvious blockers before browser proof; it is not hosted acceptance.

Hosted public and tenant-readiness proof must be rerun after deployment before a real organization is invited:

```bash
PUBLIC_FAMILY_BASE_URL=https://www.leaguepilot.us QA_PROOF_BASE_URL=https://www.leaguepilot.us PUBLIC_ORGANIZATION_ID=<organization-uuid> PUBLIC_ACCESS_REVIEW_WINDOW='within two business days' npm run qa:public-family-proof
QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:tenant-readiness-proof
```

Local tenant-readiness proof only demonstrates the current checkout and configured Supabase project. Hosted proof is the evidence that production aliases, auth cookies, Supabase env values, and signed-in admin route wrappers all agree after deployment.

Local or isolated-QA proof demonstrates only the selected checkout, deployment, and guarded Supabase project. The hosted commands above must remain read-only when pointed at production. Mutating session, seed, lifecycle, provider, payment, media, or migration proof stays on isolated QA; production acceptance must use the separately named read-only harness required by `EXT-PRODUCTION-READONLY`.

CI runs source validation in `.github/workflows/static-smoke.yml`. Live Supabase QA proof is manual through `.github/workflows/supabase-qa-proof.yml` because it requires project secrets and mutates seeded QA rows. Configure these required secrets in the `qa` GitHub Actions environment: `QA_SUPABASE_URL`, `QA_SUPABASE_ANON_KEY`, `QA_SUPABASE_SERVICE_ROLE_KEY`, and `QA_SUPABASE_PROJECT_REF`. The workflow maps them into the runtime names expected by the app scripts: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Optional QA user override secrets belong only in the isolated `qa` environment. If absent, bootstrap generates fictional QA credentials on the guarded target. Never substitute production identities or production service credentials.

To verify manually, open GitHub Actions, choose `Supabase QA proof`, run the workflow from `workflow_dispatch`, and confirm the preflight passes before `Seed QA users and rows`, `Prove real-session RLS`, and `Prove signed-in browser paths and brand surfaces`. The `QA_SUPABASE_SERVICE_ROLE_KEY` secret must belong only to the QA Supabase project, must not be production, and must never be committed or printed.

Latest preserved proof: the manual GitHub `Supabase QA proof` workflow passed on 2026-06-28 at https://github.com/TOTALLYMAJOR/LittleLeaguePlatform/actions/runs/28328007719 after QA migrations through `0019` were applied.

## Fictional Demo Tenant

Use this when the product needs a fuller, safer demo tenant than the QA proof rows:

```bash
DEMO_TENANT_SEED_CONFIRM=load-fictional-data npm run supabase:demo-tenant
npm run qa:demo-tenant-proof
```

The script creates or updates fictional demo auth users and a `LeaguePilot Demo League` tenant with active season/team setup, rostered players, guardian links, schedules, RSVPs, snack and volunteer jobs, chat, media links, registration queue rows, brand profile evidence, sponsor proof records, provider-review drafts, support requests, audit rows, and mobile usage events. Demo credentials are written to `.env.local` keys beginning with `DEMO_`.

The seed command uses `SUPABASE_SERVICE_ROLE_KEY` and mutates the configured Supabase project, so verify `NEXT_PUBLIC_SUPABASE_URL` before running it. The rows are idempotent and fictional, but they are still real database rows in that project. The demo proof command also uses the service-role key for readback and requires a reachable app URL, defaulting to `http://localhost:3001` unless `DEMO_TENANT_BASE_URL` or `QA_PROOF_BASE_URL` is set. The demo seed and proof never execute email, SMS, Web Push, Stripe, AI-provider, or storage-provider calls; provider delivery rows remain draft, failed, or suppressed evidence only.

If the target project has not applied the notification delivery execution metadata migration, the seed falls back to base `notification_delivery_attempts` rows and prints a warning. That fallback is acceptable for product demo data, but provider-send worker proof still requires the execution metadata columns to be present.

Historical repair note: the configured project was repaired on 2026-07-16 by renumbering notification delivery execution metadata to `0021_notification_delivery_execution.sql` and aligning migration history. New environments must install and read back the complete ordered migration chain under explicit environment authority; do not repeat the one-off repair as a current instruction. In this WSL environment, full `supabase db push` through the transaction pooler can report `prepared statement "lrupsc_1_0" already exists`; `scripts/supabase-push.mjs` treats that pooler failure as a no-op only when local and remote versions are already aligned.

## Vercel And Supabase Networking

Do not buy or require Vercel Static IP solely for the current Supabase app path. The production app should talk to Supabase through `NEXT_PUBLIC_SUPABASE_URL` over HTTPS, with Supabase Auth and RLS enforcing parent, coach, and admin scope. `SUPABASE_SERVICE_ROLE_KEY` remains server/CI only.

Do not enable Supabase Postgres/pooler network restrictions for the Vercel app unless a fixed-egress architecture is intentionally added. If direct database IP allowlisting becomes a hard requirement later, choose and document one of these paths before enabling it: Vercel Static IP, a small fixed-egress proxy/VPS for backend-only database work, or a separate controlled migration/proof runner.

Direct database commands, including migration pushes and proof seeding, should run from local admin machines or CI with environment-specific credentials. Keep QA and production Supabase project refs, anon keys, and service-role keys separated.

## AI Coach Provider

AI Coach Workspace provider rewrites use the OpenAI Responses API from the server route `/api/coach/ai-workspace`. The route requires a verified Supabase session plus assigned-coach or organization-admin access for the selected team.

Required server-only environment variables:

```bash
AI_COACH_PROVIDER_ENABLED=true
AI_OPERATIONS_COPILOT_ENABLED=false
OPENAI_API_KEY=<server-only key>
OPENAI_AI_COACH_MODEL=gpt-5.5
OPENAI_OPERATIONS_COPILOT_MODEL=gpt-5.5
# Optional when Netlify AI Gateway injects an OpenAI-compatible endpoint.
OPENAI_BASE_URL=<provider base URL>
```

Keep `OPENAI_API_KEY` out of `NEXT_PUBLIC_*` variables. Provider requests use `store: false`, local privacy filters, source evidence, and review-only output. Generated provider drafts do not publish, queue notifications, or send provider messages.

Keep `AI_OPERATIONS_COPILOT_ENABLED=false` until migration `20260818172017` is applied on isolated QA and the aggregate-only proposal evals pass. Enabling it changes ranking and rationale generation only. Approval records still do not execute the underlying league action.

The dated production AI proof recorded in historical trackers is not a current execution instruction. Any new provider proof requires an approved named environment and provider authority. Preview OpenAI remains out of scope under `DEC-PREVIEW-OPENAI`; generated output remains draft/review-only.

## Admin Proof Closure Readiness

Use the local verifier before LPM-004 hosted QA:

```bash
npm run qa:admin-proof-readiness
```

The verifier reads repository source only. It checks that media report, media moderation, team-builder publish, broader admin export scope, and public intake abuse-control contracts remain present in route handlers, Supabase adapters, migrations, and focused tests.

Passing this command is not hosted acceptance. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, send providers, deploy, or configure edge/firewall controls. Hosted signed-in browser proof, Supabase readback, and deployed edge/shared-store rate-limit proof remain required before LPM-004 closure.

## Reporting Archive Readiness

Use the local verifier before LPM-011 hosted export and archive QA:

```bash
npm run qa:reporting-archive-readiness
```

The verifier reads repository source only. It checks active organization-admin export authority, the eight supported export kinds, selected-organization and derived-ID export scoping, narrowed profile joins before contact data is joined, CSV/audit/fail-closed export generation, admin-only archive routes, archived-season readable and mutation-locked contracts, local archive fallback labeling, and separation between non-chat season preservation and chat-retention deletion proof.

Passing this command is local repository readiness proof only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, run archive close, delete chat records, call provider dashboards, upload or download files, deploy, configure secrets, or claim hosted RLS, browser, retention, restore, or production acceptance. Hosted RLS/admin export proof, hosted archive smoke proof, real season-close proof, chat-retention cleanup proof, deleted-chat readback proof, backup/PITR/restore proof, accessibility proof, and production archive acceptance remain open gates.

## Operational-Truth Feature Gates

Migration `0023_operational_truth_hardening.sql` is already in the promoted chain. A newly created isolated target must install the complete ordered chain before proof. Local compilation does not prove connected-project RLS, storage policy, provider webhook, or connected-account behavior.

Every gated capability requires its environment switch and the matching organization column:

| Capability | Environment switch | Organization column | Additional requirement |
| --- | --- | --- | --- |
| Offline replay | `OFFLINE_WRITES_ENABLED`; client UI also uses `NEXT_PUBLIC_OFFLINE_WRITES_ENABLED` | `offline_writes_enabled` | Session-derived context, idempotency receipt, current record and schedule versions. |
| Email/SMS/Web Push | `PROVIDER_SENDS_ENABLED` | `provider_sends_enabled` | Human approval, consent/preference evaluation, QA recipient allowlist or explicit production approval, provider credentials/readiness, verified webhook handling, and durable suppression. |
| Private media | `MEDIA_UPLOADS_ENABLED` | `media_uploads_enabled` | `MEDIA_SCAN_ADAPTER_READY=true`, private Storage/RLS, clean scan evidence, consent, human family release. |
| Stripe | `PAYMENTS_ENABLED` | `payments_enabled` | Connect Standard account readiness, restricted server key, signed webhook, replay-safe event record. |

High-impact archive previews also require server-only `IMPACT_PREVIEW_SECRET`. Disabling a gate returns the feature to online-only, draft/proof-only, quarantine-only, or link-only behavior without deleting records.

Provider-specific server variables are read only by their adapters:

- SendGrid: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, and webhook verification key.
- Pingram SMS: exact `SMS_PROVIDER=pingram`, `PINGRAM_API_KEY`, an approved `PINGRAM_API_BASE_URL`, sender configuration, `PINGRAM_WEBHOOK_SECRET`, `PINGRAM_CONTACT_DIGEST_SECRET`, and `PINGRAM_SMS_SENDER_READY=true`.
- Twilio SMS: rollback only when `SMS_PROVIDER=twilio`, with account/auth credentials and `TWILIO_MESSAGING_SERVICE_SID`.
- Web Push: VAPID subject/public/private keys.
- Stripe: restricted/test server key and endpoint webhook secret.
- Media scanner: `MEDIA_SCAN_ENDPOINT`, `MEDIA_SCAN_TOKEN`, and `MEDIA_SCAN_PROVIDER`.
- Internal notification worker: `NOTIFICATION_WORKER_TOKEN`. Every execution
  request must include the reviewed delivery attempt as `expectedAttemptId`;
  the claim query is filtered to that exact UUID and fails closed if it cannot
  claim exactly that row. The token-protected `GET` readback returns only the
  hosted Supabase project reference and requested organization gate state for
  environment-authority proof; it does not expose keys or execute delivery.

Keep production execution disabled until sandbox/allowlist tests, duplicate-webhook tests, failure/retry behavior, RLS, hosted configuration, cost controls, and monitoring are proven. Provider acceptance is not delivery; Checkout return is not payment confirmation; upload completion is not family release.

## Pingram SMS Transport

Current state on 2026-07-27: Pingram is the intended SMS transport in code. The named `codex/ui-ux-100-shell-chat` Vercel branch Preview has server-only Pingram sender, webhook, contact-digest, and worker configuration bound to isolated Supabase preview `gmrvnnkxksqkcxcmydhr`; Vercel Authentication currently intercepts the registered callback before LeaguePilot signature verification. Sender readiness, all send gates, and the demo-organization gate remain off, and no live SMS has been sent. Production remains untouched. See `docs/pingram-preview-activation-2026-07-27.md`. Twilio remains an explicit rollback transport only. Do not treat a local API key, adapter tests, a queued attempt, provider acceptance, or a deployed webhook route as delivery proof.

The worker selects SMS transport only from the exact server value `SMS_PROVIDER=pingram` or `SMS_PROVIDER=twilio`; a missing or unknown value remains suppressed. Pingram also requires all general provider gates plus its own readiness:

```bash
SMS_PROVIDER=pingram
PINGRAM_API_KEY=<server-only key>
PINGRAM_API_BASE_URL=https://api.pingram.io
PINGRAM_FROM_NUMBER=<approved E.164 sender when required>
PINGRAM_SMS_TYPE=leaguepilot_transactional_sms
PINGRAM_WEBHOOK_SECRET=<server-only webhook secret>
PINGRAM_CONTACT_DIGEST_SECRET=<server-only HMAC secret, at least 32 characters>
PINGRAM_SMS_SENDER_READY=false

PROVIDER_SENDS_ENABLED=false
PROVIDER_DELIVERY_MODE=qa
PROVIDER_PRODUCTION_APPROVED=false
PROVIDER_QA_RECIPIENT_ALLOWLIST=<explicit QA recipients only>
```

`PINGRAM_SMS_SENDER_READY` is a human-controlled readiness declaration; change it only after the selected Pingram workspace, sender, consent source, and webhook target have been reviewed. Keep `PROVIDER_SENDS_ENABLED=false` and each organization’s `provider_sends_enabled=false` until the intended environment has the transport-safety migration, signed-webhook proof, recipient preference and opt-in proof, a narrow QA allowlist, cost controls, and delivery reconciliation.

Pingram posts signed events to `/api/provider-webhooks/pingram`. The route verifies the signature against the untouched raw body before parsing, rejects stale or malformed evidence, and derives lifecycle-scoped replay keys because Pingram may reuse its callback tracking identity across delivery states. A short database processing lease prevents concurrent duplicate handling, and a fast callback stays pending until its outbound tracking ID is recorded and reconciled. Verified `SMS_DELIVERED` and `SMS_FAILED` events update delivery evidence without collapsing provider acceptance, delivery, read, or recipient acknowledgment. Verified `SMS_UNSUBSCRIBE` and `SMS_SUBSCRIBE` events atomically persist organization/user STOP/START state using a keyed contact fingerprint rather than a raw phone number. STOP disables both organization- and team-scoped SMS preferences in that organization. The suppression decision is keyed to organization/user, so a phone change or digest-key rotation cannot silently bypass it. START clears only the provider STOP suppression and never silently opts a family back in. `SMS_INBOUND` is evidence only and does not trigger an automated reply.

Pingram requests are sent once. A timeout, connection error, server-error response, oversized response, or malformed successful response is indeterminate because the provider may have accepted the request. The attempt is marked for reconciliation and is not automatically retried. Resolve it from a verified webhook or provider-console evidence before any manual retry so one family does not receive a duplicate message.

Activation sequence:

1. Apply and read back `supabase/migrations/20260727223340_pingram_sms_transport_safety.sql`, `supabase/migrations/20260727224549_pingram_sms_execution_authority.sql`, and `supabase/migrations/20260727230627_pingram_terminal_reconciliation.sql` in the named non-production environment.
2. Configure Pingram secrets server-side, register the exact hosted webhook URL, and leave both provider-send gates off.
3. Prove valid, invalid, stale, duplicate, delivered, failed, STOP, START, and unmatched webhook cases without real-family data.
4. Set `PINGRAM_SMS_SENDER_READY=true`, keep `PROVIDER_DELIVERY_MODE=qa`, add only controlled test recipients, and enable the environment plus one test organization for a reviewed sandbox send.
5. Reconcile provider acceptance, verified delivery/failure, local suppression, audit evidence, and cost/volume monitoring.
6. Treat production activation as a separate approval: set `PROVIDER_DELIVERY_MODE=production` and `PROVIDER_PRODUCTION_APPROVED=true` only with an approved sender, consent/opt-out process, incident owner, and rollback plan.

## Prompt Workflow Companion

Generate a reviewable implementation or debugging prompt without invoking Codex:

```bash
npm run codex:spec -- --system LeaguePilot --goal "Describe the bounded goal" --proofLevel local
npm run codex:debug -- --system LeaguePilot --symptom "Describe current behavior" --expected "Describe expected behavior"
```

System profiles for LeaguePilot, QuietPilot, Little Legend Studios, and Champion Coach OS live under `tools/prompt-api/`. Matching VS Code tasks are available under `Codex: Generate implementation spec` and `Codex: Generate debugging brief`. These commands print only; they do not edit a repository, call a provider, or execute Codex.

## Common Issues

### Port 8081 Is Already In Use

Edit `docker-compose.yml` and change the host side of the port mapping:

```yaml
ports:
  - "8082:3000"
```

Then run:

```bash
docker compose up -d --build
```

### Changes Do Not Appear In Docker

The Compose build copies the Next app into the image. Rebuild after file changes:

```bash
docker compose up -d --build
```

### Container Is Running But Page Fails

Run:

```bash
docker compose ps
docker compose logs web
curl -I http://localhost:8081/
```

## Production Readiness Warning

Historical hosting evidence: hosted Supabase/browser proof passed for the then-current `https://www.leaguepilot.us` deployment on 2026-07-02. That result does not prove the 2026-07-27 commit or current environment. Real-family acceptance requires the closeout ledger’s external gates, including a separately named read-only production harness.

Google and Facebook SSO use Supabase OAuth through `/auth/callback`. Hosted production requires the Google and Facebook auth providers to be enabled in the Supabase project and the allowed redirect URLs to include `https://www.leaguepilot.us/auth/callback`, `https://leaguepilot.us/auth/callback`, and the intended local/preview callback URLs. OAuth identity does not grant role access by itself; parent, coach, and admin surfaces still depend on approved membership and guardian-link rows.

To configure Supabase Auth through the Management API, set `SUPABASE_ACCESS_TOKEN` or `SUPABASE_MANAGEMENT_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID` or `FACEBOOK_APP_ID`, and `FACEBOOK_CLIENT_SECRET` or `FACEBOOK_APP_SECRET`, then run:

```bash
npm run supabase:oauth -- --apply
```

The script derives the project ref from `SUPABASE_PROJECT_REF` or `NEXT_PUBLIC_SUPABASE_URL`, preserves existing redirect allow-list entries, adds the LeaguePilot callback URLs, and enables the Google/Facebook providers without printing secrets. The Google and Facebook developer consoles must also use the Supabase provider callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.

For tenant onboarding, do not rely on anonymous raw signup emails as the only admin path until Supabase Auth SMTP/quota limits are configured and proven. Use existing admin accounts, QA/admin-created users, invite records, or the reviewed registration-approval flow for tenant setup. Live email/SMS/Web Push notifications remain draft/internal records until the intended provider is explicitly selected and its consent, suppression, allowlist, webhook, reconciliation, hosted configuration, and operational proof all pass.

## Expanded fictional showcase tenant

Load or refresh the complete demo tenant with:

```bash
DEMO_TENANT_SEED_CONFIRM=load-fictional-data npm run seed:demo-showcase
```

The command first refreshes the existing guarded base tenant, then adds the Stars and Foxes teams, two more coaches, two more approved parents, four players, four games, four visible chat messages, four approved media links, and one authenticated visitor with no protected grants. New fictional account values are written as `DEMO_*` keys in `.env.local`; do not publish that file.

For hosted UI evidence after loading:

```bash
DEMO_TENANT_BASE_URL=https://www.leaguepilot.us npm run qa:demo-tenant-proof
```
