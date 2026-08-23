---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# Software Requirements Specification

Status: draft. Source truth is the current Next.js app, `docs/Features.md`, `docs/capability-matrix.md`, `docs/privacy-security.md`, `docs/production-task-board.md`, and Supabase migrations.

## Scope

LeaguePilot supports private youth sports operations for organization admins, coaches, and parent/guardian accounts. It manages teams, seasons, registrations, rosters, schedules, RSVPs, team chat, media links, notifications, weather drafts, Parent Replay, AI Coach Workspace drafts, branding, sponsors, exports, and audit evidence.

## Non-Goals

- Children do not authenticate.
- External email, SMS, Web Push sends, Stripe collection, media upload storage, and native Expo distribution are not production capabilities unless a dedicated provider slice implements and proves them.
- Agent or AI output is not autonomous authority for child access, provider sends, publishing, media moderation, score corrections, billing, or archive close.

## Users And Roles

| Role | Description | Access principle |
| --- | --- | --- |
| Parent/guardian | Family account linked to one or more players. | Can see only approved child/team information and perform scoped family actions. |
| Coach | Assigned staff for one or more teams. | Can manage assigned team operations and draft family-facing content. |
| Organization admin | League operator. | Can manage organization-scoped setup, approvals, teams, brand, exports, safety, and audit surfaces. |
| Anonymous visitor | Public user before login. | Can access public registration and auth/prototype-safe surfaces only. |
| Agent/provider service | Server-side assistant or integration. | Can draft/recommend/record only through service policy and approval gates. |

## Functional Requirements

| ID | Requirement | Current implementation/proof |
| --- | --- | --- |
| FR-001 | Authenticate private parent, coach, and admin surfaces with Supabase sessions. | Route wrappers, `lib/supabase/route-auth.ts`, route guard tests, QA proof. |
| FR-002 | Enforce parent access through guardian/player/team scope. | `lib/supabase/access-control.ts`, RSVP/snack/volunteer APIs, RLS proof. |
| FR-003 | Enforce coach access through assigned active team membership. | Coach routes, weekly update, Parent Replay, AI Coach Workspace, route tests. |
| FR-004 | Enforce organization admin access for admin operations. | Admin route wrappers, admin APIs, RLS/security proof. |
| FR-005 | Support parent dashboard, RSVP, schedule preferences, snacks, volunteers, messages, media, practice recaps, and family access. | `/parent/*`, `qa:session-proof`, domain and route tests. |
| FR-006 | Support coach dashboard, attendance, schedule, roster, messages, weather drafts, weekly updates, Parent Replay, and review-only AI Coach Workspace. | `/coach/*`, provider boundary tests, hosted AI proof. |
| FR-007 | Support registration request intake and admin approval/rejection with audit records. | `/registration`, `/admin/registrations`, registration approval migrations and APIs. |
| FR-008 | Support team, season, roster, membership, brand, logo metadata, theme default, sponsor, export, security, and operations admin workflows. | `/admin/*`, admin APIs, feature tracker and capability matrix. |
| FR-009 | Persist Team Chat messages, moderation, read receipts, and Realtime wiring without child accounts. | `/team-chat`, `/api/team-chat/*`, Team Chat service and tests. |
| FR-010 | Keep notification/provider delivery as draft, review, retry-plan, and delivery-attempt records until live sends are approved. | `/api/provider-delivery/*`, provider delivery tests, hosted proof rows. |
| FR-011 | Support weather alert drafting through provider-ordered weather services without automatic parent delivery. | `/api/weather-alerts/draft`, `lib/services/weather/`, weather tests. |
| FR-012 | Support PWA install/offline baseline and usage metrics. | `public/manifest.webmanifest`, `public/sw.js`, `/offline`, `/api/mobile-usage-events`. |
| FR-013 | Support sponsor records and billing-proof readiness without live Stripe collection by default. | `/admin/sponsors`, `/api/admin/sponsors`, sponsor billing tables and docs. |
| FR-014 | Preserve season archive data and deletion rules for retention-sensitive chat content. | `docs/archive-readiness-checklist.md`, archive/admin surfaces. |
| FR-015 | Preserve the static prototype separately from production app truth. | `public/prototype/`, prototype route noindex and docs. |

## Non-Functional Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| NFR-001 | Child privacy by default. | Children cannot log in; child names are minimized; parent access requires guardian links. |
| NFR-002 | Tenant and team isolation. | Route tests, RLS tests, and QA proof prevent cross-org/team access. |
| NFR-003 | Auditability. | Admin/provider-sensitive actions write audit, delivery-attempt, approval, or proof records. |
| NFR-004 | Provider safety. | No provider send/payment/upload occurs without explicit implementation, consent, approval, logs, and proof. |
| NFR-005 | Availability and graceful degradation. | Seed fallback is allowed for unavailable live reads but must not be described as production persistence. |
| NFR-006 | Security. | Server-side secrets stay out of `NEXT_PUBLIC_*`; service-role keys remain backend/CI only. |
| NFR-007 | Mobile-first usability. | Parent, coach, and admin homes remain responsive and PWA-compatible. |
| NFR-008 | Testability. | Critical policy, domain, route, RLS, browser, and build checks are runnable from package scripts. |
| NFR-009 | Operability. | Runbook covers local, Docker, QA proof, hosted proof, env boundaries, and common issues. |
| NFR-010 | Compliance posture. | Privacy, retention, provider, and child-safety controls are documented and traceable. |

## Acceptance And Traceability

| Requirement range | Primary proof |
| --- | --- |
| FR-001 to FR-004, NFR-001 to NFR-003 | `npm test`, `npm run qa:rls-proof`, route access tests, `docs/privacy-security.md`. |
| FR-005 to FR-008 | `npm run qa:session-proof`, route smoke tests, `docs/Features.md`, `docs/capability-matrix.md`. |
| FR-009 to FR-013 | Provider boundary tests, API route tests, feature tracker, production task board. |
| FR-014 to FR-015 | Archive checklist, prototype route preservation, docs. |
| NFR-006 to NFR-010 | `docs/runbook.md`, `docs/production-audit-action-items.md`, `docs/enterprise/governance-risk.md`. |

## Open Requirement Decisions

- Whether live email/SMS/Web Push sends are in launch scope.
- Whether media upload storage is in launch scope or link-based media remains sufficient.
- Whether sponsor billing remains proof-only or Stripe collection is implemented.
- Whether Expo native distribution is justified after PWA usage evidence.
- Which preview branch, if any, receives non-production OpenAI provider configuration.
