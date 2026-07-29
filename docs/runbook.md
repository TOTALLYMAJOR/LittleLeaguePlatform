# Runbook

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

## Local Sponsor Stripe Readiness Proof

Run the no-mutation source verifier before any LPM-009 Stripe sandbox, webhook, hosted-admin, reconciliation, refund/failure, or production payment proof:

```bash
npm run qa:sponsor-stripe-readiness
```

The verifier reads repository files only. It checks that sponsor billing records, invoice readiness, payment-proof state, placement, fulfillment, and public display remain separate; proof-only status and browser return messages do not claim Stripe settlement; one-time sponsor collection uses server-side Checkout Sessions when enabled; Stripe keys stay server-side; missing Stripe configuration fails closed; and signature-verified webhooks remain the only settlement truth. It also checks that docs prefer restricted API keys, separate environments, and that no Stripe secret or restricted key values are stored in source.

Passing this command proves local repository readiness proof only. It does not call Stripe, Supabase, sign in, run Playwright, seed data, mutate hosted records, create Checkout Sessions, configure API keys or webhook secrets, register webhook endpoints, charge or refund payments, call provider dashboards, deploy, or claim sandbox, hosted, provider, finance, production payment, or production acceptance.

The remaining open gates are Stripe sandbox account setup, restricted key creation, webhook endpoint registration, signing-secret configuration, sandbox Checkout Session proof, signed webhook replay/duplicate proof, refund/failure proof, hosted admin proof, finance reconciliation, and production payment approval. Keep restricted API keys in environment-specific server secret storage with separate environments for sandbox/preview/production. No Stripe secret or restricted key values are stored in source.

## Local Sponsor Fulfillment Readiness Proof

Run the no-mutation source verifier before any LPM-010 hosted public/admin browser proof, placement rendering proof, logo asset proof, report proof, renewal delivery proof, or production sponsor acceptance:

```bash
npm run qa:sponsor-fulfillment-readiness
```

The verifier reads repository files only. It checks that public sponsor placement helpers filter active sponsors to approved placement keys, Team Portal placement stays team-scoped, admin sponsor saves reject invalid placement keys and cross-organization assignments, Supabase sponsor reads expose only approved logo assets, submitted logo URLs remain pending review inputs, unavailable sponsor data fails closed, Sponsor Hub and revenue summaries separate configured placement, reviewed logo metadata, billing/payment proof, renewal review, report export, delivered-placement proof, and unproven impact, renewal email remains human-reviewed and provider-disconnected, and public/parent surfaces avoid child, parent-contact, private media, billing, redemption, and sponsor-attributed impact leaks.

Passing this command proves local repository readiness proof only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, send renewal email, call email/SMS/push providers, call Stripe, create or refund payments, upload files, fetch external logo assets, call provider dashboards, deploy, or claim hosted, observed-rendering, provider, finance, accessibility, production, or production sponsor acceptance.

The remaining open gates are hosted public/admin browser proof, observed placement-rendering proof, approved logo asset proof, sponsor recap/report artifact proof, renewal email sandbox proof, public placement leak QA, accessibility proof, finance reconciliation, and production sponsor acceptance. Passing local readiness does not prove public placement actually rendered, that approved logo assets load from storage/CDN, that a recap/report artifact is acceptable, that renewal email sandbox delivery has consent and webhook proof, or that finance and production acceptance are complete.

## Supabase QA Proof

Use these checks after migrations are applied to a Supabase QA or preview project:

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

Migration `0024_coordination_loops.sql` adds the Season Launch commit/rollback RPCs, practice-run receipts, family caregiver handoffs, Game-Day Resolution receipts/RPC, and atomic notification acknowledgment. Before promotion, apply all migrations to a disposable empty PostgreSQL/Supabase database, then verify:

- a reviewed roster import can commit and safely roll back provenance-created rows;
- a completed practice receipt can be linked once to Parent Replay;
- a guardian handoff is limited to the linked player and same-team event;
- monitor/confirm/delay/cancel decisions require coach/admin authority and an action receipt;
- acknowledgment requires the intended recipient plus an existing delivery-attempt record.

Migration `0025_family_first_sign_in.sql` adds adult-owned language/privacy setup and an atomic service-only first-sign-in RPC. Before enabling the setup redirect in a hosted environment, prove that an active parent can save preferences, an unlinked account is rejected, notification rows remain scoped to the adult and team, an audit row is attributed, and zero provider sends occur. Missing `0025` intentionally leaves existing parents on `/parent`; it is not treated as completed setup.

Migration `0026_parent_invite_acceptance.sql` adds one-time, identity-matched parent invitation acceptance. Apply it only after proving exact invited-email match, active-season and invited-guardian scope, replay rejection, wrong-account rejection, expiry/revocation behavior, audit attribution, and zero provider sends. This migration accepts a securely delivered secret; it does not issue or send one. Existing approval-created hashes are not reversible, so invitation issuance/provider delivery remains blocked until an approved server-side issuance path is implemented and proven.

Migration `0027_additional_guardian_requests.sql` adds the human-reviewed additional-guardian path. Apply it after `0026`. Proposals require an active guardian link for exactly one child in an active season and do not alter access. Approval and rejection require an active organization administrator plus a 10-500 character decision reason. Approval revalidates the proposing guardian and scope, hashes a server-generated secret, creates an invited guardian row, and returns a seven-day fragment link once for manual sharing; no provider job is created or sent. Prove parent/admin cross-family denial, duplicate-request denial, wrong-account acceptance denial, cancellation, rejection, expiry, acceptance, revocation, membership retention when another linked child remains, audit attribution, and zero provider sends. This manual path does not repair unrecoverable legacy invitation hashes or establish outbound email/SMS delivery.

Migration `0028_transportation_responsibility.sql` adds guardian-owned event transportation without upgrading legacy caregiver notes into authority. Apply it after `0027`. A request is direction-, child-, event-, and schedule-version scoped and remains unassigned. A different active team guardian may offer seats, which records driver-side acceptance; the requesting guardian must separately accept before responsibility becomes assigned. Recorded pickup restrictions stop request/offer/accept without revealing restriction content. A schedule-version mismatch fails acceptance and projects as needs review. Either adult can withdraw with a 10-500 character reason and audit attribution; no home address or provider message is created. Prove request/offer/accept/withdraw, outbound/return independence, same-actor denial, cross-team/cross-family denial, restriction denial, cancellation/expiry/version drift, Event Passport readback, and zero provider sends before promotion.

Migration `0029_temporary_caregiver_authorizations.sql` adds one-child/team, selected-event, time-bound temporary care without creating guardian membership. Apply it after `0028`. The guardian reviews 1-10 events, a window no longer than 14 days, Event Passport view, optional pickup, and fixed prohibited actions. The exact-email caregiver separately accepts a one-time fragment secret; the secret is hashed at rest and rotated after acceptance or revocation. A future scope remains accepted-upcoming until its start. Expiry and attributed revocation remove server access, and the caregiver surface clears its private cache namespace at next contact. Prove wrong-email, replay, future-start, expiry, revocation, pickup restriction, active-guardian removal, cross-family/team denial, current event-version readback, cache clearing, audit attribution, and zero provider sends before promotion.

The local empty-database migration and transactional workflow smoke proves SQL installation and behavior only. It does not replace real-session RLS, hosted route, provider sandbox, webhook, or production deployment proof.

`supabase:qa-users` creates or updates the QA admin, parent, and coach credentials in `.env.local` when they are not already supplied. `qa:rls-proof` signs in through the anon key and verifies parent, coach, and anonymous Row Level Security boundaries. `qa:session-proof` verifies signed-out gates, signed-in browser routes, and parent RSVP/preference/snack/volunteer live actions, then confirms those parent action rows with the QA service-role key before capturing screenshots under `output/playwright/`. `qa:tenant-readiness-proof` signs in as the QA admin, opens `/admin/health` and `/admin/teams`, verifies tenant setup/readiness copy, and captures mobile plus desktop screenshots under `output/playwright/tenant-readiness/`. `qa:demo-tenant-proof` signs in with DEMO admin, coach, and parent credentials, verifies fictional `LeaguePilot Demo League` content across role-scoped routes, confirms demo Supabase row counts and delivery-attempt metadata, writes `output/playwright/demo-tenant/demo-tenant-proof.json`, and captures mobile plus desktop screenshots under `output/playwright/demo-tenant/`. `qa:brand-proof` verifies the `/admin/themes` brand launch checklist, all 20 target brand surfaces, monitoring events, and alert rules against `QA_PROOF_BASE_URL`, then captures `output/playwright/brand-launch-validation.png`. `qa:coordination-proof` signs in as QA admin, coach, and parent, verifies all five coordination workbenches at 1440px and 390px, fails on document overflow, and writes screenshots plus `coordination-proof.json` under `output/playwright/coordination-loops/`.

`qa:communication-room-record-proof` signs in with the fictional QA parent, proves three linked children across two teams without exposing an archived team, persists a parent reply with service-role readback, and proves critical-message acknowledgment plus audit readback when migrations `0023` and `0024` are present. It refuses non-`example.com` parent identities, creates only a provider-suppressed QA notification, and writes `output/playwright/communication-room/populated-record-proof.json`. A missing delivery-evidence column or acknowledgment RPC is reported as a blocking migration gap rather than inferred as success.

`qa:public-family-proof` verifies signed-out Home, Schedule, Request Team Access, and Sign In at 320, 390, 768, and 1440 pixels. It checks CTA/copy contracts, empty forms, canonical-organization and current-team exposure, calendar-provider actions, value-gated installation, 44px controls, document overflow, and browser errors, then writes screenshots plus `proof.json` under `output/playwright/public-family-phase0/`. Set `PUBLIC_FAMILY_BASE_URL` for a non-default local or hosted target. Hosted environments must configure `PUBLIC_ORGANIZATION_ID` and `PUBLIC_ACCESS_REVIEW_WINDOW`; local fallback organization selection is deterministic but is not a production configuration claim.

Before hosted public and tenant readiness browser proof, run the no-mutation hosted readiness preflight with the intended hosted URL, the target public organization configuration, the public access review-window copy, and QA admin command inputs:

```bash
QA_PROOF_BASE_URL=https://www.leaguepilot.us PUBLIC_ORGANIZATION_ID=<organization-uuid> PUBLIC_ACCESS_REVIEW_WINDOW='within two business days' NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> QA_ADMIN_EMAIL=<qa-admin@example.com> QA_ADMIN_PASSWORD=<qa-admin-password> npm run qa:hosted-readiness-preflight
```

The preflight only validates inputs and prints the follow-on proof commands. It does not deploy, bypass Vercel Authentication, seed Supabase, write hosted data, send providers, write payments, upload media, run migrations, or establish production acceptance. Passing it clears obvious blockers before browser proof; it is not hosted acceptance.

Hosted public and tenant-readiness proof must be rerun after deployment before a real organization is invited:

```bash
PUBLIC_FAMILY_BASE_URL=https://www.leaguepilot.us QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:public-family-proof
QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:tenant-readiness-proof
```

Local tenant-readiness proof only demonstrates the current checkout and configured Supabase project. Hosted proof is the evidence that production aliases, auth cookies, Supabase env values, and signed-in admin route wrappers all agree after deployment.

CI runs source validation in `.github/workflows/static-smoke.yml`. Live Supabase QA proof is manual through `.github/workflows/supabase-qa-proof.yml` because it requires project secrets and mutates seeded QA rows. Configure these required secrets in the `qa` GitHub Actions environment: `QA_SUPABASE_URL`, `QA_SUPABASE_ANON_KEY`, `QA_SUPABASE_SERVICE_ROLE_KEY`, and `QA_SUPABASE_PROJECT_REF`. The workflow maps them into the runtime names expected by the app scripts: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Optional QA user override secrets can also be configured in the same `qa` environment: `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_PARENT_EMAIL`, `QA_PARENT_PASSWORD`, `QA_COACH_EMAIL`, and `QA_COACH_PASSWORD`. If they are absent, `npm run supabase:qa-users` generates/appends QA credentials before `qa:rls-proof` and `qa:session-proof` run.

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

The configured Supabase project was repaired on 2026-07-16 by renumbering notification delivery execution metadata to `0021_notification_delivery_execution.sql`, applying its idempotent SQL, and marking migration version `0021` applied. If another environment still lacks `idempotency_key`, `next_attempt_at`, `retry_count`, or `dead_lettered_at` on `notification_delivery_attempts`, apply migrations through a reachable direct/session database URL or execute `0021_notification_delivery_execution.sql` and repair migration history before rerunning provider-send proof. In this WSL environment, full `supabase db push` through the transaction pooler can report `prepared statement "lrupsc_1_0" already exists`; `scripts/supabase-push.mjs` now verifies migration history and treats that pooler failure as a no-op only when local and remote versions are aligned.

## Vercel And Supabase Networking

Do not buy or require Vercel Static IP solely for the current Supabase app path. The production app should talk to Supabase through `NEXT_PUBLIC_SUPABASE_URL` over HTTPS, with Supabase Auth and RLS enforcing parent, coach, and admin scope. `SUPABASE_SERVICE_ROLE_KEY` remains server/CI only.

Do not enable Supabase Postgres/pooler network restrictions for the Vercel app unless a fixed-egress architecture is intentionally added. If direct database IP allowlisting becomes a hard requirement later, choose and document one of these paths before enabling it: Vercel Static IP, a small fixed-egress proxy/VPS for backend-only database work, or a separate controlled migration/proof runner.

Direct database commands, including migration pushes and proof seeding, should run from local admin machines or CI with environment-specific credentials. Keep QA and production Supabase project refs, anon keys, and service-role keys separated.

## AI Coach Provider

AI Coach Workspace provider rewrites use the OpenAI Responses API from the server route `/api/coach/ai-workspace`. The route requires a verified Supabase session plus assigned-coach or organization-admin access for the selected team.

Required server-only environment variables:

```bash
AI_COACH_PROVIDER_ENABLED=true
OPENAI_API_KEY=<server-only key>
OPENAI_AI_COACH_MODEL=gpt-5.5
```

Keep `OPENAI_API_KEY` out of `NEXT_PUBLIC_*` variables. Provider requests use `store: false`, local privacy filters, source evidence, and review-only output. Generated provider drafts do not publish, queue notifications, or send provider messages.

Hosted proof:

```bash
QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:ai-coach-proof
```

The proof signs in as the QA coach, opens `/coach/parent-replay`, requests an AI provider rewrite, asserts OpenAI-sourced draft/review-only output, and captures `output/playwright/ai-coach-provider-rewrite-qa-session-live.png`.

Current Vercel state: Production and Development have the AI Coach provider variables configured. Preview is intentionally out of launch scope until a named non-production preview branch target is chosen.

## Admin Proof Closure Readiness

Use the local verifier before LPM-004 hosted QA:

```bash
npm run qa:admin-proof-readiness
```

The verifier reads repository source only. It checks that media report, media moderation, team-builder publish, broader admin export scope, and public intake abuse-control contracts remain present in route handlers, Supabase adapters, migrations, and focused tests.

Passing this command is not hosted acceptance. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, send providers, deploy, or configure edge/firewall controls. Hosted signed-in browser proof, Supabase readback, and deployed edge/shared-store rate-limit proof remain required before LPM-004 closure.

## Operational-Truth Feature Gates

Apply `supabase/migrations/0023_operational_truth_hardening.sql` to a non-production project before enabling any new persistence path. Local compilation does not prove the migration, RLS, storage policy, provider webhook, or connected-account behavior.

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

The app is production-hosted, and hosted Supabase/browser proof passed for the current `https://www.leaguepilot.us` deployment on 2026-07-02. Real-family launch still requires preserving the QA and hosted proof gates after env rotation and keeping provider sends disconnected unless explicitly implemented.

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
