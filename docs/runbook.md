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

The local empty-database migration and transactional workflow smoke proves SQL installation and behavior only. It does not replace real-session RLS, hosted route, provider sandbox, webhook, or production deployment proof.

`supabase:qa-users` creates or updates the QA admin, parent, and coach credentials in `.env.local` when they are not already supplied. `qa:rls-proof` signs in through the anon key and verifies parent, coach, and anonymous Row Level Security boundaries. `qa:session-proof` verifies signed-out gates, signed-in browser routes, and parent RSVP/preference/snack/volunteer live actions, then confirms those parent action rows with the QA service-role key before capturing screenshots under `output/playwright/`. `qa:tenant-readiness-proof` signs in as the QA admin, opens `/admin/health` and `/admin/teams`, verifies tenant setup/readiness copy, and captures mobile plus desktop screenshots under `output/playwright/tenant-readiness/`. `qa:demo-tenant-proof` signs in with DEMO admin, coach, and parent credentials, verifies fictional `LeaguePilot Demo League` content across role-scoped routes, confirms demo Supabase row counts and delivery-attempt metadata, writes `output/playwright/demo-tenant/demo-tenant-proof.json`, and captures mobile plus desktop screenshots under `output/playwright/demo-tenant/`. `qa:brand-proof` verifies the `/admin/themes` brand launch checklist, all 20 target brand surfaces, monitoring events, and alert rules against `QA_PROOF_BASE_URL`, then captures `output/playwright/brand-launch-validation.png`. `qa:coordination-proof` signs in as QA admin, coach, and parent, verifies all five coordination workbenches at 1440px and 390px, fails on document overflow, and writes screenshots plus `coordination-proof.json` under `output/playwright/coordination-loops/`.

`qa:communication-room-record-proof` signs in with the fictional QA parent, proves three linked children across two teams without exposing an archived team, persists a parent reply with service-role readback, and proves critical-message acknowledgment plus audit readback when migrations `0023` and `0024` are present. It refuses non-`example.com` parent identities, creates only a provider-suppressed QA notification, and writes `output/playwright/communication-room/populated-record-proof.json`. A missing delivery-evidence column or acknowledgment RPC is reported as a blocking migration gap rather than inferred as success.

`qa:public-family-proof` verifies signed-out Home, Schedule, Request Team Access, and Sign In at 320, 390, 768, and 1440 pixels. It checks CTA/copy contracts, empty forms, canonical-organization and current-team exposure, calendar-provider actions, value-gated installation, 44px controls, document overflow, and browser errors, then writes screenshots plus `proof.json` under `output/playwright/public-family-phase0/`. Set `PUBLIC_FAMILY_BASE_URL` for a non-default local or hosted target. Hosted environments must configure `PUBLIC_ORGANIZATION_ID` and `PUBLIC_ACCESS_REVIEW_WINDOW`; local fallback organization selection is deterministic but is not a production configuration claim.

Hosted tenant-readiness proof must be rerun after deployment before a real organization is invited:

```bash
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

## Operational-Truth Feature Gates

Apply `supabase/migrations/0023_operational_truth_hardening.sql` to a non-production project before enabling any new persistence path. Local compilation does not prove the migration, RLS, storage policy, provider webhook, or connected-account behavior.

Every gated capability requires its environment switch and the matching organization column:

| Capability | Environment switch | Organization column | Additional requirement |
| --- | --- | --- | --- |
| Offline replay | `OFFLINE_WRITES_ENABLED`; client UI also uses `NEXT_PUBLIC_OFFLINE_WRITES_ENABLED` | `offline_writes_enabled` | Session-derived context, idempotency receipt, current record and schedule versions. |
| Email/SMS/Web Push | `PROVIDER_SENDS_ENABLED` | `provider_sends_enabled` | Human approval, consent/preference evaluation, QA recipient allowlist, provider credentials, verified webhook handling. |
| Private media | `MEDIA_UPLOADS_ENABLED` | `media_uploads_enabled` | `MEDIA_SCAN_ADAPTER_READY=true`, private Storage/RLS, clean scan evidence, consent, human family release. |
| Stripe | `PAYMENTS_ENABLED` | `payments_enabled` | Connect Standard account readiness, restricted server key, signed webhook, replay-safe event record. |

High-impact archive previews also require server-only `IMPACT_PREVIEW_SECRET`. Disabling a gate returns the feature to online-only, draft/proof-only, quarantine-only, or link-only behavior without deleting records.

Provider-specific server variables are read only by their adapters:

- SendGrid: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, and webhook verification key.
- Twilio: account/auth credentials and `TWILIO_MESSAGING_SERVICE_SID`.
- Web Push: VAPID subject/public/private keys.
- Stripe: restricted/test server key and endpoint webhook secret.
- Media scanner: `MEDIA_SCAN_ENDPOINT`, `MEDIA_SCAN_TOKEN`, and `MEDIA_SCAN_PROVIDER`.
- Internal notification worker: `NOTIFICATION_WORKER_TOKEN`.

Keep production execution disabled until sandbox/allowlist tests, duplicate-webhook tests, failure/retry behavior, RLS, hosted configuration, cost controls, and monitoring are proven. Provider acceptance is not delivery; Checkout return is not payment confirmation; upload completion is not family release.

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

For tenant onboarding, do not rely on anonymous raw signup emails as the only admin path until Supabase Auth SMTP/quota limits are configured and proven. Use existing admin accounts, QA/admin-created users, invite records, or the reviewed registration-approval flow for tenant setup. Live email/SMS/Web Push notifications remain draft/internal records until a provider-send worker, provider adapters, webhooks, suppression, retries, and hosted proof are implemented.
