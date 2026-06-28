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

`supabase:qa-users` creates or updates the QA admin, parent, and coach credentials in `.env.local` when they are not already supplied. `qa:rls-proof` signs in through the anon key and verifies parent, coach, and anonymous Row Level Security boundaries. `qa:session-proof` verifies the signed-in browser routes and captures screenshots under `output/playwright/`. `qa:brand-proof` verifies the `/admin/themes` brand launch checklist, all 20 target brand surfaces, monitoring events, and alert rules against `QA_PROOF_BASE_URL`, then captures `output/playwright/brand-launch-validation.png`.

CI runs source validation in `.github/workflows/static-smoke.yml`. Live Supabase QA proof is manual through `.github/workflows/supabase-qa-proof.yml` because it requires project secrets and mutates seeded QA rows. Configure these required secrets in the `qa` GitHub Actions environment: `QA_SUPABASE_URL`, `QA_SUPABASE_ANON_KEY`, `QA_SUPABASE_SERVICE_ROLE_KEY`, and `QA_SUPABASE_PROJECT_REF`. The workflow maps them into the runtime names expected by the app scripts: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Optional QA user override secrets can also be configured in the same `qa` environment: `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_PARENT_EMAIL`, `QA_PARENT_PASSWORD`, `QA_COACH_EMAIL`, and `QA_COACH_PASSWORD`. If they are absent, `npm run supabase:qa-users` generates/appends QA credentials before `qa:rls-proof` and `qa:session-proof` run.

To verify manually, open GitHub Actions, choose `Supabase QA proof`, run the workflow from `workflow_dispatch`, and confirm the preflight passes before `Seed QA users and rows`, `Prove real-session RLS`, and `Prove signed-in browser paths and brand surfaces`. The `QA_SUPABASE_SERVICE_ROLE_KEY` secret must belong only to the QA Supabase project, must not be production, and must never be committed or printed.

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

This scaffold is not production-hosted yet. Before deployment, the app needs real auth, Supabase wiring, row-level security tests, provider integrations, monitoring, and retention jobs.
