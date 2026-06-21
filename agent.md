# Agent Guide

## Current Repo Truth

This repo is now a root-level Next.js + TypeScript production scaffold for Little League HQ. The original static MVP prototype is preserved under `public/prototype/`.

- `app/` defines the App Router routes.
- `components/feature-panels.tsx` owns the current interactive route panels.
- `lib/domain/` owns typed domain models, seed data, pure business rules, reducer logic, and Vitest coverage.
- `supabase/migrations/0001_core_schema.sql` is the Supabase-ready contract draft.
- `docs/Features.md` is the status tracker for the six implemented feature slices.
- `public/prototype/index.html` keeps the old static prototype available at `/prototype/index.html`.

There is still no real backend, auth provider, delivery provider, push service, or production persistence. The app uses typed local seed data and browser-session reducer state.

## Local And Docker Runbook

Install and run locally:

```bash
npm install
npm run dev
```

Verify:

```bash
npm run typecheck
npm test
npm run build
npm audit
```

Run with Docker Compose:

```bash
docker compose up -d --build
curl -I http://localhost:8081/
```

Stop:

```bash
docker compose down
```

Preferred aliases:

```bash
make validate
make up
make smoke
make down
```

## Agent Operating Rules

1. Preserve the prototype/production boundary. Do not describe local reducer state as real persistence, provider delivery, auth, or access grants.
2. Preserve child privacy defaults. Children do not log in, player display names stay first name plus last initial, and parent/guardian accounts own child access.
3. Do not add autonomous provider sends without approval gates. Email, SMS, push, and chat actions need delivery logs, opt-in checks, and human approval in production.
4. Keep role boundaries explicit. Admin, coach, and parent permissions must remain visible in UI, service policy, and tests.
5. Keep business rules in `lib/domain/` and route UI in `app/` or `components/`.
6. Update `docs/Features.md` when implementing or changing a feature slice.

## Agentic Architecture Direction

Use `docs/agentic-architecture.md` as the source of truth for production agent boundaries. The intended system is human-in-the-loop:

- Agents recommend, validate, queue, draft, match, summarize, and flag.
- Humans approve roster imports, registration matches, invite sends, score corrections, media moderation, and archive close.
- Services enforce auth, row-level access, provider calls, audit logs, and retention. Agents do not bypass service policy.

## Definition Of Done

A production slice is not done until it has:

- Typed domain contracts where needed.
- Role-scoped service or domain policy.
- UI state for success, failure, loading, and empty data.
- Audit logging for admin or provider-sensitive actions.
- Tests for permission boundaries and critical workflow behavior.
- Updated tracker/docs when scope changes.
