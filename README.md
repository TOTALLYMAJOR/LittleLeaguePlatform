---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LeaguePilot

LeaguePilot is the public app and product identity for this youth sports operations platform. The production public domain is `https://www.leaguepilot.us`, with `https://leaguepilot.us` kept as the apex alias.

The app is private software for league admins, coaches, and parent/guardian accounts. The current repo is a root-level Next.js App Router + TypeScript application with authenticated Supabase adapters, typed fallback states, and guarded local/isolated-QA proof tools. Implementation in this repository is not, by itself, hosted or production acceptance.

The original static MVP prototype remains available under `public/prototype/` and can be viewed at `/prototype/index.html`.

## Current Product Truth

- Public-facing copy should use `LeaguePilot` as the app name. Treat legacy `Little League HQ` wording as historical/internal prototype language unless a specific doc or migration still needs it.
- Children do not log in. Parent/guardian accounts own child access.
- Player display names stay privacy-preserving outside admin-only contexts.
- Parent, coach, and admin routes use role-aware shells and scoped server data.
- Supabase Auth, route handlers, service adapters, and RLS enforce production boundaries where slices are connected.
- Notification, weather, Parent Replay, AI Coach, sponsor billing, and provider-delivery records are draft/review/proof surfaces unless a provider slice explicitly enables live sends, payments, uploads, or native distribution.
- Enterprise planning artifacts are tracked under `docs/enterprise/`.
- The canonical 2026-07-27 shipped/open/decision/historical split is `docs/backlog-closeout-2026-07-27.md`.

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
npm audit --omit=dev
npm audit
```

Production dependencies and the full development graph are separate release signals. See the closeout ledger for the retained upstream-only Next ESLint `minimatch`/`brace-expansion` advisory.

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

## Isolated QA Proof

Supabase QA proof uses seeded fictional users and environment-specific secrets on a local or explicitly identified isolated QA target:

```bash
npm run supabase:qa-users
npm run qa:rls-proof
npm run qa:session-proof
npm run qa:brand-proof
```

`qa:session-proof` and Communication Room record proof mutate rows. LP-QA-GUARD-001 makes them isolated-QA-only and rejects the protected production Supabase project and canonical production host. Do not point them at `leaguepilot.us` or `www.leaguepilot.us`. Production acceptance requires a separately named read-only harness; see gate `EXT-PRODUCTION-READONLY` in the closeout ledger.

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side or CI-only. Keep provider keys out of `NEXT_PUBLIC_*`.

## Documentation Map

| Area | Source |
| --- | --- |
| Feature truth | `docs/capability-matrix.md` |
| Capability and production gaps | `docs/capability-matrix.md` |
| Enterprise artifact packet | `docs/enterprise/README.md` |
| Supabase schema and RLS shape | `docs/supabase-data-model.md`, `supabase/migrations/` |
| API contract draft | `docs/api/openapi.yaml`, `docs/enterprise/api-specification.md` |
| Architecture and agent boundaries | `docs/agentic-architecture.md`, `docs/adr/` |
| Production task board | `docs/production-task-board.md` |
| Local queue closeout and remaining gates | `docs/backlog-closeout-2026-07-27.md` |
| Operations and QA proof | `docs/runbook.md`, `docs/production-audit-action-items.md` |
| Privacy and provider rules | `docs/privacy-security.md`, `docs/codex-rules.md` |

## Agent Skill Baseline

Check the local skill baseline before changing agent workflow, React/Next.js surfaces, Supabase/API runtime seams, hosted proof, browser evidence, or publish flow:

```bash
npm run check:skills
```

The repo-local runtime skill lives at `.agents/skills/leaguepilot-api-runtime-resilience/SKILL.md` and preserves this app's Next.js, Supabase, RLS, provider-boundary, and child-privacy rules.
