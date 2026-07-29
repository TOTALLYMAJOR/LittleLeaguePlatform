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

`qa:public-family-proof` verifies signed-out Home, Schedule, Request Team Access, and Sign In at 320, 390, 768, and 1440 pixels. It checks CTA/copy contracts, empty forms, canonical-organization and current-team exposure, calendar-provider actions, value-gated installation, 44px controls, document overflow, and browser errors, then writes screenshots plus `proof.json` under `output/playwright/public-family-phase0/`. Set `PUBLIC_FAMILY_BASE_URL` for a non-default local or hosted target. Hosted environments must configure `PUBLIC_ORGANIZATION_ID` and `PUBLIC_ACCESS_REVIEW_WINDOW`; local fallback organization selection is deterministic but is not a production configuration claim.

Local or isolated-QA tenant-readiness proof only demonstrates the selected checkout, app deployment, and guarded Supabase project. Production acceptance must use the separately named read-only harness required by `EXT-PRODUCTION-READONLY`; it must not reuse a mutating QA command.

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
OPENAI_API_KEY=<server-only key>
OPENAI_AI_COACH_MODEL=gpt-5.5
```

Keep `OPENAI_API_KEY` out of `NEXT_PUBLIC_*` variables. Provider requests use `store: false`, local privacy filters, source evidence, and review-only output. Generated provider drafts do not publish, queue notifications, or send provider messages.

The dated production AI proof recorded in historical trackers is not a current execution instruction. Any new provider proof requires an approved named environment and provider authority. Preview OpenAI remains out of scope under `DEC-PREVIEW-OPENAI`; generated output remains draft/review-only.

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
