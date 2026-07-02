# Agent Guide

## Current Repo Truth

This repo is now a root-level Next.js + TypeScript production scaffold for LeaguePilot / Little League HQ. The original static MVP prototype is preserved under `public/prototype/`.

- `app/` defines the App Router routes.
- `components/feature-panels.tsx` owns the current interactive route panels.
- `lib/domain/` owns typed domain models, seed data, pure business rules, reducer logic, and Vitest coverage.
- `lib/supabase/` owns Supabase adapters, authenticated session checks, access-control helpers, and provider-boundary services.
- `supabase/migrations/` defines the staged Supabase schema and RLS policy contract.
- `docs/Features.md` and `docs/capability-matrix.md` track shipped capability, provider-boundary state, and remaining production gaps.
- `public/prototype/index.html` keeps the old static prototype available at `/prototype/index.html`.

The app now has Supabase-backed slices for registration, approval, memberships, Team Portal reads/theme writes, Team Chat persistence, parent/coach dashboard reads, authenticated mutation routes, QA session proof, and provider/mobile foundations. Some screens still use typed seed fallback when live rows or auth context are unavailable. External provider sends remain disconnected unless a slice explicitly enables provider delivery.

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

## Agent Skill Workflow

Use available skills as part of the lightest workflow that fits risk:

- Use `leaguepilot-api-runtime-resilience` for API routes, Supabase adapters, authenticated session checks, access-control helpers, RLS proof, provider-boundary records, degraded states, and runtime resilience questions or changes.
- Use `nextjs` and `react-best-practices` for Next.js App Router pages, route handlers, Server/Client Component boundaries, React state, accessibility, and rendering behavior.
- Use `playwright` or `playwright-testing` when route reachability, signed-in QA proof, mobile screenshots, browser regressions, or first-viewport evidence matters.
- Use `design-taste-frontend` for parent, coach, admin, and team portal UI work that changes layout, visual hierarchy, or route-level interaction quality.
- Use `openai-docs` for AI Coach Workspace, OpenAI Responses API, model, tool-calling, privacy, or review-only AI provider work.
- Use Twilio and SendGrid skills for SMS, email delivery, messaging compliance, delivery webhooks, templates, sender setup, or notification-provider work. Provider sends still require consent, approval, delivery logs, and explicit production configuration.
- Use `stripe-best-practices` for sponsor billing, checkout, invoices, payment proof, subscriptions, or settlement work.
- Use `vercel-deploy` for Vercel deployment, hosted proof, and environment setup.
- Use GitHub skills, including `github` and `yeet`, for PR, CI, review, scoped commit, push, or publish workflows.

Run `npm run check:skills` when changing this workflow, onboarding a new agent, or before relying on React, Supabase, API/runtime, hosted/provider, browser, or publish skills in a fresh checkout.

Recommended next install for this repo is the public Supabase skill found via `npx skills find supabase`: `npx skills add supabase/agent-skills@supabase -g -y`. Do not require it for local validation until it is installed or project-vendored.

Skills do not override this file, `docs/codex-rules.md`, child privacy defaults, role boundaries, provider-send gates, or production proof boundaries.

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
