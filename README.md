# Little League HQ / LeaguePilot

A root-level Next.js + TypeScript production scaffold for a private youth sports organization platform. The original static MVP prototype is preserved under `public/prototype/`.

The current app has Supabase-backed slices for authenticated parent, coach, and admin workflows while retaining typed seed fallbacks where live rows or auth context are unavailable. External email, SMS, push, Stripe, AI provider, and native app distribution remain disconnected unless explicitly approved and configured.

## Agent Skill Baseline

This repo uses a light agent skill baseline for LeaguePilot / Little League HQ work. The baseline routes API/runtime resilience, Supabase/RLS proof, React/Next.js UI work, Playwright evidence, provider-boundary work, GitHub publishing, and hosted proof through skills that are available locally or project-vendored.

Check the current baseline:

```bash
npm run check:skills
```

The repo-local skill lives at `.agents/skills/leaguepilot-api-runtime-resilience/SKILL.md`. It adapts the QuietPilot runtime-resilience pattern to this app's Next.js, Supabase, RLS, provider-boundary, and child-privacy seams.

Public skill search found a strong optional Supabase skill for this stack:

```bash
npx skills add supabase/agent-skills@supabase -g -y
```

Do not treat external skills as permission to bypass `AGENTS.md`, `docs/codex-rules.md`, role boundaries, child privacy defaults, provider approval gates, or hosted proof requirements.

## Preserved Prototype Notes

- Added parent/coach friendly My Team home screen
- Added onboarding checklist
- Added invite sender simulation
- Added invite status tracking
- Added role permission matrix
- Added production roadmap screen
- Added calendar-style schedule cards
- Added clearer launch readiness signals
- Kept v2 improvements including prototype login screen
- Added parent self-registration flow
- Added registration review queue
- Added roster management screen
- Added player edit/add modals
- Added roster CSV export
- Added notification center
- Added push notification preferences
- Added stronger child privacy banner
- Added YouTube in-app embed preview
- Added Google Photos in-app browser placeholder
- Added more role-aware permissions
- Added cleaner mobile navigation and privacy-first copy

## Included MVP screens

- Login / role preview
- Dashboard
- Teams
- Rosters
- Master schedule
- Admin-only score entry
- Standings
- Team group chat
- Coach-parent private messaging
- Google Photos + YouTube media links
- Parent registration queue
- CSV roster import validation
- CSV schedule import validation
- Notification preferences and log
- Read-only season archive simulation
- Chat deletion after season archive

## Product assumptions baked into this prototype

- One organization only.
- Divisions are 3U, 4U, 5U, and 6U.
- Players are children, so they do not log in.
- Parent/guardian accounts represent child players.
- Player display name should be first name + last initial.
- Team spaces require login in the real app.
- Parents, coaches, and org admin can add Google Photos and YouTube links.
- Media opens inside the app in the production build.
- Org admin uploads rosters and schedule CSV files.
- Coaches can edit assigned rosters.
- Only org admin can enter scores.
- Standings are visible to all logged-in parents and coaches.
- Chat history is deleted after the season.
- Archived seasons preserve non-chat records and become read-only.

## Run locally

Open `index.html` in a browser.

No build step is required.

## Suggested production stack

- Web/admin app: Next.js + TypeScript
- Mobile app: Expo React Native
- Backend: Supabase Postgres
- Auth: Supabase Auth
- Realtime chat: Supabase Realtime
- Push notifications: Expo Notifications
- Email/SMS: provider integration such as SendGrid/Postmark + Twilio
- Media MVP: store only Google Photos and YouTube links

## Next production milestone

Turn this static prototype into a real Supabase-backed application with authentication, row-level security, database migrations, server-side CSV imports, push tokens, invite links, and deployed web/mobile builds.

## v3 focus

This version is better for showing the idea to a league director, coach, or potential developer because it explains what is already simulated, what the real app permissions should be, and what production phases come next.
