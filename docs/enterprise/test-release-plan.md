---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# Test Plan, QA Reports, And Release Artifacts

Status: reconciled planning artifact. Current state and gate ownership are in `docs/backlog-closeout-2026-07-27.md`; dated evidence remains in `docs/production-audit-action-items.md` and `docs/build-progress.md`.

## Test Strategy

| Layer | Commands or evidence | Purpose |
| --- | --- | --- |
| Type generation and TypeScript | `npm run typecheck` | Validate App Router types and TypeScript contracts. |
| Unit/domain tests | `npm test` | Validate domain rules, policies, route handlers, provider boundaries, UI contracts. |
| Build | `npm run build` | Prove production bundle and static/dynamic route generation. |
| Dependency audit | `npm audit --omit=dev`; `npm audit` | Keep production exposure separate from the retained development-only Next ESLint graph advisory. |
| RLS proof | `npm run qa:rls-proof` | Prove Supabase parent/coach/anonymous isolation. |
| Session/browser proof | `npm run qa:session-proof` on a guarded isolated QA target only | Prove signed-out gates, signed-in routes, and live action writes without touching production. |
| Production acceptance | Separately named read-only harness (required by `EXT-PRODUCTION-READONLY`) | Prove production role/session reachability and scoped reads without seed, write, acknowledgment, publish, provider, or cleanup actions. |
| AI provider proof | `npm run qa:ai-coach-proof` | Prove review-only OpenAI rewrite path when enabled. |
| Brand proof | `npm run qa:brand-proof` | Prove brand launch surfaces and monitoring contract. |
| Docker smoke | `docker compose up -d --build`; `curl -I http://localhost:8081/` | Prove container runtime. |
| Hosted smoke | `QA_PROOF_BASE_URL=<url> ...` | Prove deployed host/env/auth behavior. |

## Traceability Matrix

| Requirement | Proof source |
| --- | --- |
| FR-001 auth sessions | Route guard tests, `qa:session-proof`, `qa:rls-proof`. |
| FR-002 parent access | RSVP/snack/volunteer route tests, `qa:session-proof`, access-control tests. |
| FR-003 coach access | Weekly update, Parent Replay, AI workspace route tests and browser proof. |
| FR-004 admin access | Admin route tests, RLS proof, admin hosted screenshots. |
| FR-005 parent operations | `components/feature-panels.test.tsx`, `app/api-live-actions.test.ts`, hosted proof. |
| FR-006 coach operations | Coach route tests, weekly update proof, AI proof. |
| FR-007 registration | Registration route/API tests; browser approval proof still open. |
| FR-008 admin operations | Admin APIs and dashboards; broader hosted admin proof still open. |
| FR-009 Team Chat | Team Chat service/API tests and route smoke. |
| FR-010 provider boundary | Provider delivery tests and no-send proof. |
| FR-011 weather drafts | Weather service tests and route proof. |
| FR-012 PWA/mobile | Route smoke, offline route, mobile usage event tests. |
| FR-013 sponsors | Sponsor route tests and sponsor billing-proof docs. |
| FR-014 archive | Archive checklist and archive/admin proof when implemented. |
| NFR-001 privacy | `docs/privacy-security.md`, access-control tests, RLS proof. |
| NFR-006 secrets | Runbook/env checks, CI secret scoping, no `NEXT_PUBLIC_*` provider keys. |

## QA Report Template

Use this for release notes or pull request evidence:

```text
Release/build:
Date:
Environment:
Commit:
Hosted URL:

Validation:
- npm run typecheck:
- npm test:
- npm run build:
- npm audit:
- npm run qa:rls-proof:
- Isolated QA target identity and `npm run qa:session-proof`:
- QA_PROOF_BASE_URL=<url> npm run qa:ai-coach-proof:
- QA_PROOF_BASE_URL=<url> npm run qa:brand-proof:

Screenshots/artifacts:
- output/playwright/...

Known issues:
- Provider sends:
- Media uploads:
- Stripe billing:
- Native Expo:
- Public intake abuse controls:

Release verdict:
```

Never substitute a production alias in the session/browser line. Historical production-alias artifacts predate LP-QA-GUARD-001 and are not reusable instructions.

## Release Notes Template

```text
Version:
Date:
Commit:

Added:
-

Changed:
-

Fixed:
-

Security/privacy:
-

Migrations:
-

Provider boundaries:
-

Validation:
-

Known gaps:
-
```

## Coding Standards Report

| Standard | Evidence |
| --- | --- |
| TypeScript strictness | `npm run typecheck`. |
| Test coverage for critical behavior | `npm test`; focused route/domain/service tests. |
| Next.js route validity | `next typegen` inside `npm run typecheck`; `npm run build`. |
| Security/privacy rules | `docs/codex-rules.md`, `docs/privacy-security.md`, RLS proof. |
| Provider-boundary discipline | Provider tests and docs requiring draft/review/proof separation. |
| Formatting/diff hygiene | `git diff --check`; lint if run. |

## Release Readiness Gate

A release is not ready for real-family dependence unless:

- Typecheck, tests, and build pass.
- RLS proof passes after schema/RLS changes.
- Hosted proof passes after env rotation, deployment, auth, route, or private write changes.
- Provider sends, payments, uploads, and AI output remain accurately labeled as disconnected, proof-only, or review-only unless implemented and proven.
- Release notes list migrations, env changes, proof artifacts, and known gaps.
