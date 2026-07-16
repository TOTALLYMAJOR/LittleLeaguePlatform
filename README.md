# Little League HQ / LeaguePilot

LeaguePilot is a private youth sports operations app for league admins, coaches, and parent/guardian accounts. The current repo is a root-level Next.js App Router + TypeScript app with Supabase-backed production paths for several authenticated workflows and typed seed fallbacks where live rows or auth context are unavailable.

The original static MVP prototype remains available under `public/prototype/` and can be viewed at `/prototype/index.html`.

## Current Product Truth

- Children do not log in. Parent/guardian accounts own child access.
- Player display names stay privacy-preserving outside admin-only contexts.
- Parent, coach, and admin routes use role-aware shells and scoped server data.
- Supabase Auth, route handlers, service adapters, and RLS enforce production boundaries where slices are connected.
- Notification, weather, Parent Replay, AI Coach, sponsor billing, and provider-delivery records are draft/review/proof surfaces unless a provider slice explicitly enables live sends, payments, uploads, or native distribution.
- Enterprise planning artifacts are tracked under `docs/enterprise/`.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the Next.js dev server:

```bash
npm run dev
```

Open `http://localhost:3000/`.

## Verify

Core local checks:

```bash
npm run typecheck
npm test
npm run build
npm audit
```

Docker smoke:

```bash
docker compose up -d --build
curl -I http://localhost:8081/
docker compose down
```

Preferred make targets:

```bash
make validate
make up
make smoke
make down
```

## Hosted And QA Proof

Supabase QA proof uses seeded QA users and environment-specific secrets:

```bash
npm run supabase:qa-users
npm run qa:rls-proof
npm run qa:session-proof
npm run qa:brand-proof
```

Hosted proof can target the deployed app:

```bash
QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof
QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:ai-coach-proof
QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:brand-proof
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side or CI-only. Keep provider keys out of `NEXT_PUBLIC_*`.

## Documentation Map

| Area | Source |
| --- | --- |
| Feature truth | `docs/Features.md` |
| Capability and production gaps | `docs/capability-matrix.md` |
| Enterprise artifact packet | `docs/enterprise/README.md` |
| Supabase schema and RLS shape | `docs/supabase-data-model.md`, `supabase/migrations/` |
| API contract draft | `docs/api/openapi.yaml`, `docs/enterprise/api-specification.md` |
| Architecture and agent boundaries | `docs/agentic-architecture.md`, `docs/adr/` |
| Production task board | `docs/production-task-board.md` |
| Operations and QA proof | `docs/runbook.md`, `docs/production-audit-action-items.md` |
| Privacy and provider rules | `docs/privacy-security.md`, `docs/codex-rules.md` |

## Agent Skill Baseline

Check the local skill baseline before changing agent workflow, React/Next.js surfaces, Supabase/API runtime seams, hosted proof, browser evidence, or publish flow:

```bash
npm run check:skills
```

The repo-local runtime skill lives at `.agents/skills/leaguepilot-api-runtime-resilience/SKILL.md` and preserves this app's Next.js, Supabase, RLS, provider-boundary, and child-privacy rules.
