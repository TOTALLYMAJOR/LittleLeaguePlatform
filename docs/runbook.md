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
```

`supabase:qa-users` creates or updates the QA parent and coach credentials in `.env.local`. `qa:rls-proof` signs in through the anon key and verifies parent, coach, and anonymous Row Level Security boundaries. `qa:session-proof` verifies the signed-in browser routes and captures screenshots under `output/playwright/`.

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
