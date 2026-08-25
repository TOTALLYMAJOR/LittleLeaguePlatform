---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# Business Capability Model

Status: draft. This model aligns business capabilities to current app surfaces and known production gaps.

## Capability Map

| Capability | Business outcome | Current status | Primary surfaces |
| --- | --- | --- | --- |
| League setup and tenant administration | Configure organization, seasons, teams, roles, and brand. | Implemented with proof gaps. | `/admin`, `/admin/teams`, `/admin/branding`, `/admin/settings`. |
| Family access and privacy | Safely connect guardians to child/team data. | Implemented with guardian policy hardening remaining. | `/registration`, `/admin/registrations`, `/admin/guardian-links`, `/parent/family-access`. |
| Registration and roster operations | Intake registrations, detect duplicates, approve players, assign teams. | Implemented with browser proof gaps. | `/registration`, `/admin/imports`, `/admin/registrations`, `/admin/teams`. |
| Parent daily operations | Answer schedule, RSVP, snack, volunteer, media, message, and recap needs. | Implemented for core workflows. | `/parent`, `/parent/rsvp`, `/parent/schedule`, `/parent/messages`, `/parent/practice-recaps`. |
| Coach team operations | Manage attendance, communication, practice recap, schedule, roster, weather, and team readiness. | Implemented with deeper polish remaining. | `/coach`, `/coach/attendance`, `/coach/practice-recaps`, `/coach/weather-fields`. |
| Schedule and venue management | Keep events, locations, changes, exports, and field data consistent. | Partial production path. | `/schedule`, `/api/schedule`, `/api/field-locations`, `/api/schedule/export`. |
| Communications and provider delivery | Draft, review, queue, suppress, and eventually send messages. | Draft/review records implemented; live sends deferred. | `/admin/message-delivery-review`, `/api/provider-delivery/*`, `/api/notification-preferences`. |
| Team Chat | Provide private team-scoped communications. | Implemented. | `/team-chat`, `/parent/messages`, `/coach/messages`, `/api/team-chat/*`. |
| Media governance | Share approved media links and moderate/report unsafe items. | Link-based moderation implemented; upload storage deferred. | `/parent/photos`, `/admin/media-review`, `/api/media/*`. |
| Weather safety | Draft weather-aware alerts from provider data. | Provider-order draft path implemented; hosted proof open. | `/coach/weather-fields`, `/api/weather-alerts/draft`. |
| Parent Replay and coach enablement | Turn practices into parent-ready reinforcement. | Implemented as deterministic/reviewed workflow. | `/coach/practice-recaps`, `/parent/practice-recaps`, `/api/coach/parent-replay`. |
| AI Coach Workspace | Rewrite or improve drafts with scoped provider context. | Implemented as review-only when provider env is configured. | `/coach/practice-recaps`, `/api/coach/ai-workspace`. |
| Sponsorship management | Track sponsors, placements, logo metadata, and billing proof. | Records implemented; live Stripe collection deferred. | `/admin/sponsors`, `/api/admin/sponsors`. |
| Reporting and archive | Export records, preserve season evidence, and enforce retention. | Partial. | `/admin/reports-archive`, `/api/admin/exports`, `docs/archive-readiness-checklist.md`. |
| Mobile/PWA engagement | Provide installable, offline-aware parent and coach workflows. | PWA baseline implemented; native app deferred. | All routes, `/offline`, `/api/mobile-usage-events`. |

## Capability Maturity Labels

| Label | Meaning |
| --- | --- |
| Implemented | Code paths and local tests support the capability. |
| Hosted proof covered | Browser or provider proof passed against a deployed URL. |
| Provider gated | Draft/review/proof records exist, but external provider execution is disconnected. |
| Decision pending | Product or operational scope must be chosen before implementation. |
| Deferred | Intentionally outside the current launch scope. |

## Current Priority Alignment

| Priority | Capability impact | Tracker |
| --- | --- | --- |
| P0 | Keep product truth docs synchronized and preserve hosted proof gates. | `docs/production-task-board.md` LP-001. |
| P1 | Add browser proof for remaining private writes and harden public intake. | LP-003, LP-004, LP-005, LP-009, LP-010, LP-016. |
| P2 | Decide launch scope for provider sends, uploads, billing, preview AI env, and native app. | LP-013 to LP-020. |

## Capability-To-Artifact Trace

- Requirements: `docs/enterprise/srs.md`.
- Current implementation truth: `docs/Features.md`.
- Gap state: `docs/capability-matrix.md`, `docs/production-audit-action-items.md`.
- Work queue: `docs/production-task-board.md`, `docs/backlog-now.md`, `docs/backlog-next.md`.
- Architecture and provider boundaries: `docs/enterprise/architecture.md`, `docs/privacy-security.md`, `docs/agentic-architecture.md`.
