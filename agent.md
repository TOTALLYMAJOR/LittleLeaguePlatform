# Agent Guide

## Current Repo Truth

This repo is a static MVP prototype for Little League HQ. It is not a production app yet.

- `index.html` defines the login shell, navigation, route templates, modals, and static page structure.
- `app.js` owns all demo data, route rendering, role switching, CSV validation simulation, invite simulation, notification simulation, chat simulation, media-link simulation, and archive simulation.
- `styles.css` owns all layout and visual styling.
- `README.md` describes the MVP screens, assumptions, and suggested production stack.

There is no real backend, auth provider, database, mobile app, delivery provider, push service, storage layer, or persisted state in this version.

## Local And Docker Runbook

Open directly:

```bash
open index.html
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

Preferred command aliases:

```bash
make validate
make up
make smoke
make down
```

## Agent Operating Rules

1. Preserve the prototype/production boundary. Do not describe a simulated flow as real auth, real messaging, real push notifications, real imports, real payments, or real persistence.
2. Preserve child privacy defaults. Children do not log in, player display names stay first name plus last initial, and parent/guardian accounts own child access.
3. Do not add autonomous provider sends without approval gates. Email, SMS, push, and chat actions need delivery logs, opt-in checks, and human approval in production.
4. Keep role boundaries explicit. Admin, coach, and parent permissions must remain visible in UI, service policy, and tests.
5. Treat season archive as a retention workflow. Production should preserve season records while deleting chat message text according to policy.
6. Keep static prototype edits small. For major product work, create a production app scaffold instead of overloading `app.js`.

## Agentic Architecture Direction

Use `docs/agentic-architecture.md` as the source of truth for production agent boundaries. The intended system is human-in-the-loop:

- Agents recommend, validate, queue, draft, match, summarize, and flag.
- Humans approve roster imports, registration matches, invite sends, score corrections, media moderation, and archive close.
- Services enforce auth, row-level access, provider calls, audit logs, and retention. Agents do not bypass service policy.

## Backlog Discipline

Use `BACKLOG.md` for planned work. Every new task should state:

- Priority.
- Owning agent or service.
- Current prototype surface.
- Production acceptance criteria.
- Privacy, permission, or provider risk.

Use `WORKSHOP.md` for teaching or facilitation flow. Use `docs/evaluation-plan.md` before marking an agentic workflow done.

## Definition Of Done

A production slice is not done until it has:

- Schema or contract changes where needed.
- Role-scoped service policy.
- UI state for success, failure, loading, and empty data.
- Audit logging for admin or provider-sensitive actions.
- Tests for permission boundaries and critical workflow behavior.
- Updated backlog/docs when scope changes.
