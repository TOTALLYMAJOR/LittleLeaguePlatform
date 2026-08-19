# Deployment, Operations, And Software Development Plan

Status: reconciled planning artifact. This supplements `docs/runbook.md`; the canonical current gate ledger is `docs/backlog-closeout-2026-07-27.md`.

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
npm audit --omit=dev
npm audit
```

The integrated review reports production dependencies clean. The supported Next 16.2.9 ESLint graph retains a development-only `minimatch`/`brace-expansion` advisory path that is not safely removable through supported peers without weakening lint rules. Rerun both audits with registry access for every release.

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
| `AI_OPERATIONS_COPILOT_ENABLED` | Server | Enables aggregate-only Operations Copilot ranking; approval remains non-executing. |
| `OPENAI_API_KEY` | Server only | Never `NEXT_PUBLIC_*`; review-only output. |
| `OPENAI_AI_COACH_MODEL` | Server | Model selection for AI Coach provider. |
| `OPENAI_OPERATIONS_COPILOT_MODEL` | Server | Model selection for Operations Copilot structured ranking. |
| `OPENAI_BASE_URL` | Server | Optional OpenAI-compatible base URL, including the Netlify AI Gateway path. |
| `OFFLINE_WRITES_ENABLED` | Server | Offline replay kill switch; organization flag must also be true. |
| `NEXT_PUBLIC_OFFLINE_WRITES_ENABLED` | Browser | Allows the approved device outbox UI; never replaces server authorization. |
| `PROVIDER_SENDS_ENABLED` | Server | Provider execution kill switch; organization flag, human approval, consent, and allowlist still apply. |
| `PROVIDER_DELIVERY_MODE` | Server | Use `qa` for controlled recipients; `production` still requires explicit production approval. |
| `PROVIDER_PRODUCTION_APPROVED` | Server | Must be exactly `true` with production delivery mode before the QA allowlist may be bypassed. |
| `PROVIDER_QA_RECIPIENT_ALLOWLIST` | Server | Comma-separated sandbox recipients; never expose to the browser. |
| `SMS_PROVIDER` | Server | Exact SMS transport selector. Use `pingram`; `twilio` is rollback only. Missing or unknown values stay suppressed. |
| `PINGRAM_API_KEY` | Server only | Pingram send credential; presence never enables sends. |
| `PINGRAM_API_BASE_URL` | Server | Must resolve to an application-approved Pingram API origin. |
| `PINGRAM_FROM_NUMBER` / `PINGRAM_SMS_TYPE` | Server | Reviewed sender/type configuration; recipients and configured sender numbers must be E.164. |
| `PINGRAM_WEBHOOK_SECRET` | Server only | Verifies raw-body Pingram webhook signatures. |
| `PINGRAM_CONTACT_DIGEST_SECRET` | Server only | HMAC key for local STOP/START contact fingerprints; never expose or log it. |
| `PINGRAM_SMS_SENDER_READY` | Server | Human-reviewed sender/workspace readiness declaration; does not replace any provider gate. |
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
| Browser proof | Run mutating scripts only against a guarded isolated QA app/project. | Complete `EXT-HOSTED-SESSION`; production requires the separately named read-only harness in `EXT-PRODUCTION-READONLY`. |
| Provider proof | Provider rows, AI/brand proof, and local SendGrid, selected Pingram SMS, rollback-only Twilio, and Web Push adapter, approval, signature, suppression, and reconciliation tests. | Apply/read back the pending safety migrations, configure hosted secrets, and prove allowlisted sandbox delivery plus verified webhook lease/replay, STOP/START suppression, indeterminate reconciliation, cost controls, and monitoring before any live-send claim. |
| Payment proof | Local Stripe adapter and signed webhook tests. | Connected-account test-mode Checkout, replay, refund/dispute ownership, and hosted proof. |
| Media proof | Local quarantine/consent/release policy. | Private storage RLS, production scanner, retention deletion, and family-visibility proof. |
| Backups | Supabase project backups/provider controls. | Complete `EXT-BACKUP-RESTORE`: current backup, accepted PITR posture, RPO/RTO, and non-production restore drill. |
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
- Pingram delivery, STOP/START, indeterminate-reconciliation, volume, and cost monitoring if live SMS is approved.
- Stripe webhook and reconciliation monitoring if live billing is approved.
- Storage scanning/takedown monitoring if uploads are approved.
