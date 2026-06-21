# Changelog

## Unreleased

- Converted the repo root to a Next.js + TypeScript App Router scaffold.
- Preserved the original static MVP prototype under `public/prototype/`.
- Implemented all six `docs/Features.md` feature slices with typed local state: CSV duplicate detection, invite recovery, admin health, parent dashboard, RSVP, and schedule alert records.
- Added pure domain functions, reducer state, typed seed data, Supabase schema contract, and Vitest coverage.
- Updated Docker to build and run the Next production server on port `3000` behind host port `8081`.
- Added npm verification scripts and CI checks for typecheck, tests, build, and Docker smoke.
- Added Dockerfile, Compose config, and `.dockerignore` for production Docker serving.
- Added `agent.md` with repo truth, operating rules, and definition of done.
- Added `BACKLOG.md` with production backlog grouped by priority.
- Added `docs/agentic-architecture.md` with human-in-the-loop agent architecture.
- Added workshop, contribution, security, evaluation, runbook, prompt, and ADR scaffolding.

## v3 Static Prototype

- Clickable static Little League HQ prototype.
- Role preview for org admin, coach, and parent.
- Simulated dashboard, teams, rosters, schedule, standings, chat, media links, registration queue, CSV validation, notifications, invites, permissions, roadmap, and archive flows.
