# Little League HQ

A production-oriented Next.js + TypeScript scaffold for a private youth sports organization platform, with the original static MVP prototype preserved for reference.

## Current App

- Root app: Next.js App Router with typed local seed data and session-only reducer state.
- Implemented routes:
  - `/admin/imports` - CSV duplicate detection and audited import simulation.
  - `/invite/recover` and `/invite/expired` - smart invite recovery checks.
  - `/admin/invites` - invite status view.
  - `/admin/health` - launch readiness dashboard.
  - `/parent` - parent dashboard.
  - `/parent/rsvp` - one-tap RSVP.
  - `/coach/rsvps` - coach attendance summaries.
  - `/schedule` - schedule change alert record creation.
- Static prototype: `/prototype/index.html`.
- Supabase-ready schema draft: `supabase/migrations/0001_core_schema.sql`.

No real auth, database persistence, email, SMS, or push notifications are enabled yet.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/`.

## Run With Docker

```bash
make up
make smoke
```

Open `http://localhost:8081/`.

Stop with:

```bash
make down
```

## Verify

```bash
npm run typecheck
npm test
npm run build
npm audit
docker compose up -d --build
curl -fsSI http://localhost:8081/
```

## Product Boundaries

- Children do not log in.
- Child display names stay first name plus last initial.
- Invite recovery never displays or stores raw invite tokens.
- CSV imports are previewed and simulated; production commit still needs backend persistence and approval policy.
- Schedule alerts create notification records only; they do not call real push, email, or SMS providers.
- Local state is browser-session-only.

## Agentic Workshop Files

- `agent.md` - repo truth, agent operating rules, and definition of done.
- `WORKSHOP.md` - workshop agenda, exercises, and repo map.
- `BACKLOG.md` - production backlog organized by priority and agent ownership.
- `docs/Features.md` - feature tracker and original feature notes.
- `docs/agentic-architecture.md` - human-in-the-loop agent architecture.
- `docs/agent-workflows.md` - workflow cards for registration, imports, schedule, communications, media, and archive.
- `docs/evaluation-plan.md` - safety and workflow evaluations.
- `docs/privacy-security.md` - privacy, provider, logging, and agent boundaries.
- `docs/runbook.md` - local, Docker, and troubleshooting runbook.
- `docs/adr/` - architecture decision records.
- `prompts/` - reusable workshop prompts.
- `evals/` - repeatable evaluation case notes.

## Future Production Stack

- Web/admin app: Next.js + TypeScript.
- Mobile app: Expo React Native.
- Backend: Supabase Postgres.
- Auth: Supabase Auth.
- Realtime chat: Supabase Realtime.
- Push notifications: Expo Notifications.
- Email/SMS: provider integration such as SendGrid/Postmark + Twilio.
