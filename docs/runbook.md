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
npm run qa:brand-proof
```

`supabase:qa-users` creates or updates the QA admin, parent, and coach credentials in `.env.local` when they are not already supplied. `qa:rls-proof` signs in through the anon key and verifies parent, coach, and anonymous Row Level Security boundaries. `qa:session-proof` verifies signed-out gates, signed-in browser routes, and parent RSVP/preference/snack/volunteer live actions, then confirms those parent action rows with the QA service-role key before capturing screenshots under `output/playwright/`. `qa:brand-proof` verifies the `/admin/themes` brand launch checklist, all 20 target brand surfaces, monitoring events, and alert rules against `QA_PROOF_BASE_URL`, then captures `output/playwright/brand-launch-validation.png`.

CI runs source validation in `.github/workflows/static-smoke.yml`. Live Supabase QA proof is manual through `.github/workflows/supabase-qa-proof.yml` because it requires project secrets and mutates seeded QA rows. Configure these required secrets in the `qa` GitHub Actions environment: `QA_SUPABASE_URL`, `QA_SUPABASE_ANON_KEY`, `QA_SUPABASE_SERVICE_ROLE_KEY`, and `QA_SUPABASE_PROJECT_REF`. The workflow maps them into the runtime names expected by the app scripts: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Optional QA user override secrets can also be configured in the same `qa` environment: `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_PARENT_EMAIL`, `QA_PARENT_PASSWORD`, `QA_COACH_EMAIL`, and `QA_COACH_PASSWORD`. If they are absent, `npm run supabase:qa-users` generates/appends QA credentials before `qa:rls-proof` and `qa:session-proof` run.

To verify manually, open GitHub Actions, choose `Supabase QA proof`, run the workflow from `workflow_dispatch`, and confirm the preflight passes before `Seed QA users and rows`, `Prove real-session RLS`, and `Prove signed-in browser paths and brand surfaces`. The `QA_SUPABASE_SERVICE_ROLE_KEY` secret must belong only to the QA Supabase project, must not be production, and must never be committed or printed.

Latest preserved proof: the manual GitHub `Supabase QA proof` workflow passed on 2026-06-28 at https://github.com/TOTALLYMAJOR/LittleLeaguePlatform/actions/runs/28328007719 after QA migrations through `0019` were applied.

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
