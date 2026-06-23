# Tech Stack

This file tracks the intended production stack for Little League HQ. The current app remains a local Next.js scaffold with typed seed data and browser-session reducer state. Production work should reuse the current code and move capabilities behind real auth, persistence, policies, and provider adapters.

## Direction

Build mobile-first.

The first shippable mobile experience should be a responsive PWA from the existing Next.js app. Add a native Expo app only after the PWA proves usage patterns that require app-store distribution, stronger native push behavior, camera/media workflows, or native OS integrations.

## Core Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web app | Next.js App Router, React, TypeScript | Already implemented; good fit for admin, coach, parent, PWA, and server/client boundaries. |
| Styling | Current CSS with design tokens | Reuse existing styles, dark mode, team branding, and sport theme presets before adding a UI framework. |
| Mobile first | PWA first, Expo later | Fastest reuse path. Native app should share domain contracts and policies if/when added. |
| Database | Supabase Postgres | Fits teams, seasons, rosters, registrations, events, RSVPs, chat, notifications, sponsors, themes, and audits. |
| Auth | Supabase Auth | Aligns with Supabase RLS and role-scoped parent/coach/admin access. |
| Authorization | Supabase Row Level Security | Required for parent child/team scope, coach assigned-team scope, and org admin scope. |
| Realtime chat | Supabase Realtime | Best reuse path for current Team Chat domain and channel/message model. |
| Push notifications | Web Push for PWA; Expo Notifications for native | Start with explicit opt-in Web Push. Use Expo Notifications only if a native app is added. |
| Maps | Google Maps Platform | Use API-backed embeds/markers later; current app can keep Google Maps links until provider setup. |
| Weather | NWS first, Open-Meteo fallback, Tomorrow.io premium adapter | NWS is best free default for U.S. teams. Open-Meteo is useful fallback. Tomorrow.io is optional later for hyperlocal/premium weather. |
| Media | Google Photos and YouTube links first | Reuse current MVP path. Add validation, moderation, and optional storage only when needed. |
| Payments/sponsors | Local sponsor records first; Stripe later only if payments are real | Avoid payment complexity until sponsor billing/invoices are in scope. |
| AI | No default provider yet | Parent Replay is deterministic local guidance. If AI is added, generated learning plans must be draft/reviewed. |
| Deployment | Vercel or Docker-capable Node host | Keep Next standalone build working. Choose hosted platform after auth/database/provider topology is ready. |

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
