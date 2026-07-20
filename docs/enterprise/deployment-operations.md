# Deployment, Operations, And Software Development Plan

Status: draft. This supplements `docs/runbook.md`.

## Software Development Plan

| Area | Practice |
| --- | --- |
| Source organization | Next.js routes in `app/`; UI components in `components/`; pure rules in `lib/domain/`; Supabase adapters in `lib/supabase/`; providers in `lib/services/`. |
| Change control | Tie non-trivial work to `docs/production-task-board.md` and its Every-Task SaaS Check. |
| Documentation | Update `docs/Features.md`, `docs/capability-matrix.md`, and enterprise artifacts when capability state changes. |
| Testing | Run focused tests first, then typecheck/build or QA proof depending on risk. |
| Security | Do not bypass route/session checks, RLS, child privacy, provider approval, or proof boundaries. |
| Release evidence | Preserve commands, hosted URL, deployment id when known, screenshots, and known gaps. |

## Local Installation

```bash
npm install
npm run dev
```

Open `http://localhost:3000/`.

## Local Verification

```bash
npm run typecheck
npm test
npm run build
npm audit
```

## Docker Deployment Smoke

```bash
docker compose up -d --build
curl -I http://localhost:8081/
docker compose ps
docker compose down
```

## Hosted Deployment Posture

- Current primary hosted path is Vercel plus Supabase HTTPS APIs.
- Vercel Static IP is not required for the current Supabase HTTPS/Auth/RLS path.
- Do not enable direct Postgres/pooler IP allowlisting for the app unless a fixed-egress architecture is intentionally selected.
- Keep migration/proof commands in controlled local or CI environments with environment-specific credentials.

## Environment Variables

| Variable | Scope | Rule |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server public config | Public Supabase URL only. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server public config | Must be anon role, never service role. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/CI only | Never expose to browser or logs. |
| `SUPABASE_POOLER_DATABASE_URL` | Admin/migration only | Use for migration push where direct DB connectivity needs pooler. |
| `AI_COACH_PROVIDER_ENABLED` | Server | Enables AI provider rewrite route only when true. |
| `OPENAI_API_KEY` | Server only | Never `NEXT_PUBLIC_*`; review-only output. |
| `OPENAI_AI_COACH_MODEL` | Server | Model selection for AI Coach provider. |
| `OFFLINE_WRITES_ENABLED` | Server | Offline replay kill switch; organization flag must also be true. |
| `NEXT_PUBLIC_OFFLINE_WRITES_ENABLED` | Browser | Allows the approved device outbox UI; never replaces server authorization. |
| `PROVIDER_SENDS_ENABLED` | Server | Provider execution kill switch; organization flag, human approval, consent, and allowlist still apply. |
| `PROVIDER_QA_RECIPIENT_ALLOWLIST` | Server | Comma-separated sandbox recipients; never expose to the browser. |
| `MEDIA_UPLOADS_ENABLED` | Server | Private upload kill switch; organization flag and scan-adapter readiness still apply. |
| `MEDIA_SCAN_ADAPTER_READY` | Server | Explicit production scanner readiness declaration. |
| `PAYMENTS_ENABLED` | Server | Stripe execution kill switch; organization flag and connected-account readiness still apply. |
| `IMPACT_PREVIEW_SECRET` | Server | HMAC secret for expiring high-impact action previews. |
| QA user credentials | QA CI/local only | Keep separate from production identities. |

## Day-2 Operations

| Operation | Current command/evidence | Gap |
| --- | --- | --- |
| Health check | Hosted route smoke and `/admin/operations` screenshots. | Formal uptime monitor and alert routing. |
| Auth/RLS proof | `npm run qa:rls-proof`. | Scheduled proof after migrations/env rotations. |
| Browser proof | `QA_PROOF_BASE_URL=<url> npm run qa:session-proof`. | Coverage for remaining media, registration, team-builder admin writes. |
| Provider proof | Provider rows, AI proof, brand proof. | Allowlisted SendGrid/Twilio/Web Push sandbox plus verified webhook proof if sends are approved. |
| Payment proof | Local Stripe adapter and signed webhook tests. | Connected-account test-mode Checkout, replay, refund/dispute ownership, and hosted proof. |
| Media proof | Local quarantine/consent/release policy. | Private storage RLS, production scanner, retention deletion, and family-visibility proof. |
| Backups | Supabase project backups/provider controls. | Document restore drill and RPO/RTO. |
| Incident response | Runbook common issues. | Dedicated incident template and escalation contacts. |
| Audit review | Admin/security surfaces and audit rows. | Dashboard/alerting for suspicious admin/provider actions. |
| Retention | Archive checklist. | Scheduled retention jobs and restore/deletion proof. |

## Incident Response Template

```text
Incident:
Detected at:
Environment:
Affected routes/capabilities:
Tenant/team/player scope:
User-visible impact:
Data/privacy impact:
Provider/payment impact:
Initial containment:
Rollback or mitigation:
Evidence preserved:
Follow-up tasks:
```

## Backup And Restore Plan

Draft requirements:

- Confirm Supabase backup tier and restore workflow for each environment.
- Keep migrations replayable from `supabase/migrations/`.
- Test restore into non-production before relying on a production restore path.
- Preserve audit rows and archive retention policy through restore drills.
- Document RPO/RTO targets before real-family launch.

## Operational Open Items

- Formal monitoring and alerting owners.
- Restore drill evidence.
- Public intake rate-limit monitoring.
- Provider send monitoring if live sends are approved.
- Stripe webhook and reconciliation monitoring if live billing is approved.
- Storage scanning/takedown monitoring if uploads are approved.
