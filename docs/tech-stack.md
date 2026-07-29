# Tech Stack

This file tracks the intended production stack for LeaguePilot, the public app at `https://www.leaguepilot.us`. The current app is a root Next.js application with authenticated Supabase-backed parent, coach, and admin workflows, plus typed fallback states where live rows or auth context are unavailable. The [2026-07-27 closeout ledger](backlog-closeout-2026-07-27.md) is authoritative for local completion, external gates, decisions, and historical evidence; fallback state and committed code are not production acceptance.

## Direction

Use `LeaguePilot` for public product naming and `leaguepilot.us` as the public production app surface. Legacy Little League HQ wording is historical/internal unless a specific existing artifact still depends on it.

Build mobile-first.

The first shippable mobile experience should be a responsive PWA from the existing Next.js app. Add a native Expo app only after the PWA proves usage patterns that require app-store distribution, stronger native push behavior, camera/media workflows, or native OS integrations.

## Core Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web app | Next.js App Router, React, TypeScript | Already implemented; good fit for admin, coach, parent, PWA, and server/client boundaries. |
| Styling | Current CSS with design tokens | Reuse existing styles, dark mode, team branding, and sport theme presets before adding a UI framework. |
| Motion | Motion for React (`motion`) | Installed for targeted client-side animation. Use `motion/react` only in client components, animate transform/opacity, and respect reduced-motion preferences. No required workflow should depend on animation. |
| Mobile first | PWA first; Expo decision deferred | This is the current safe default, not approval to build native. Any later app must share domain contracts and policies. |
| Database | Supabase Postgres | Fits teams, seasons, rosters, registrations, events, RSVPs, chat, notifications, sponsors, themes, and audits. |
| Auth | Supabase Auth | Aligns with Supabase RLS and role-scoped parent/coach/admin access. |
| Authorization | Supabase Row Level Security | Required for parent child/team scope, coach assigned-team scope, and org admin scope. |
| Realtime chat | Supabase Realtime | Best reuse path for current Team Chat domain and channel/message model. |
| Push notifications | Web Push for PWA; Expo Notifications for native | Start with explicit opt-in Web Push. Use Expo Notifications only if a native app is added. |
| Maps | Google Maps Platform | Managed venue metadata supports approved embeds, marker labels, coordinates, notes, and fallback links; hosted key restriction and quota proof remain before depending on Maps in production. |
| Weather | NWS first, Open-Meteo fallback, Tomorrow.io premium adapter | NWS is best free default for U.S. teams. Open-Meteo is useful fallback. Tomorrow.io is optional later for hyperlocal/premium weather. |
| Media | Link-only Google Photos and YouTube references | This is the deferred safe default. Private upload/storage requires the `DEC-MEDIA` decision and `EXT-STORAGE` acceptance gate. |
| Payments/sponsors | Sponsor proof-only billing | This is the deferred safe default. Real collection requires the `DEC-BILLING` decision and `EXT-BILLING` acceptance gate. |
| AI | Deterministic first; optional reviewed OpenAI Responses API rewrite | Parent Replay remains deterministic local guidance. Provider output is draft/review-only. Preview OpenAI configuration is explicitly out of scope pending `DEC-PREVIEW-OPENAI`. |
| Deployment | Vercel or Docker-capable Node host | Current hosted path is Vercel plus Supabase HTTPS APIs. Do not require Vercel Static IP unless direct database IP allowlisting becomes an explicit fixed-egress requirement. Keep Next standalone build working. |

## Weather Provider Order

1. National Weather Service for U.S. teams.
2. Open-Meteo fallback for simple lat/lng forecasts and non-U.S. coverage.
3. Tomorrow.io as an optional premium adapter when hyperlocal, minute-level, lightning, weather maps, or commercial support justifies the key and rate limits.

Weather results should normalize into the app's own event-weather shape and become draft alerts first. No automatic parent push should happen without opt-in, policy checks, and approval.

## Mobile Build Plan

### Phase 1: Mobile PWA

- Keep Next.js as the only application.
- Improve responsive layouts route by route.
- Keep `public/manifest.webmanifest` and `public/sw.js`.
- Add install prompt UX and offline fallback.
- Add Web Push only after notification preferences and opt-in records exist.

### Phase 2: Shared Domain Contracts

- Keep `lib/domain` as the source for types, policies, and pure business rules.
- Move persistence into Supabase service adapters.
- Keep permissions testable outside the UI.

### Phase 3: Expo Native App If Needed

- Build an Expo app only if PWA limitations are real.
- Reuse domain types and service contracts.
- Focus native app on parent/coach weekly workflows: schedule, RSVP, Team Chat, Parent Replay, snacks, volunteers, and push notifications.

## Non-Negotiable Boundaries

- Registration request is not access.
- Notification record is not a sent push/email/SMS.
- Weather alert is a draft until reviewed or approved.
- Parent Replay guidance is not AI-generated unless an AI provider and review workflow are explicitly added.
- Children do not log in.
- Child names stay first name plus last initial outside admin-only contexts.
- Provider secrets stay server-side and out of `NEXT_PUBLIC_*`.

## Current Local Files To Reuse

- `app/` for App Router routes.
- `components/feature-panels.tsx` for current UI panels.
- `lib/domain/` for typed models, seed data, reducer logic, and tests.
- `docs/capability-matrix.md` for current capability truth.
- `docs/backlog-now.md` and `docs/backlog-next.md` for execution order.
