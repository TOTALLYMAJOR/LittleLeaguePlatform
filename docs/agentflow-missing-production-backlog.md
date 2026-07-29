# LeaguePilot Missing Production Slice Execution Queue

This reviewed AgentFlow queue executes the LeaguePilot missing-production work
one commit at a time from the current
`agentflow/missing-production-sequence-20260729` lineage.
The full slice inventory and external proof boundaries are governed by
`docs/missing-production-slices-work-plan.md` and
`docs/exceptional-ux-acceptance-audit.md`.

This queue does not deploy, apply migrations to a hosted project, mutate
production data, enable provider sends, enable payments, enable private media
uploads, change DNS, configure secrets, or claim hosted/provider/production
acceptance. Those gates remain explicit in the governing plan.

Completed baseline:

- LPM-001 integrated in AgentFlow build
  `build_5e3e818d-6dc6-4069-8fc9-6498a727b3eb` at integration commit
  `e7bdd57e24b26a01430e93be448b457a3cac19fc`.
- LPM-002A integrated in AgentFlow build
  `build_555180a0-4db6-4c85-8247-2c86185dd785` at integration commit
  `962abe3ff5361ffcf72e855a8b82ff50b2653be5`.
- LPM-003 integrated in AgentFlow build
  `build_c919675f-58c5-4802-8635-de00101dfe4d` at integration commit
  `cca95821e400190b2a3f7134ca2a792558f9a7a3`.
- LPM-004A integrated in AgentFlow build
  `build_4c2a4279-897c-4045-8c1a-9edf0600524e` at integration commit
  `42d16c6a096cc4d5d218268b58e2d6c8a2ba6049`.
- LPM-005A integrated in AgentFlow build
  `build_5827781b-fefd-4baf-87a2-bdf6f5eeeeef` at integration commit
  `4b80b959462fb71a9432a53a83e9ecc38b2583bd`.
- LPM-006A integrated in AgentFlow build
  `build_2df551bf-6d0a-46c0-9738-0809a1dd3a78` at integration commit
  `2c18dd75c65669f516a7224e4b4f86343ba8165f`.

## LPM-007A - Add provider sandbox readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-provider-sandbox-readiness.mjs
  - scripts/verify-provider-sandbox-readiness.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-provider-sandbox-readiness.test.mjs
  - npm test -- app/provider-boundary.test.ts lib/supabase/provider-delivery.test.ts lib/services/notifications/worker.test.ts lib/services/notifications/webhook-verification.test.ts lib/services/notifications/executor.test.ts lib/services/notifications/adapters.test.ts lib/supabase/provider-webhooks.test.ts app/api-notification-worker.test.ts app/api-pingram-webhook.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: provider-sandbox-readiness-verifier
    type: local-readiness-proof
    version: 1.0.0
    path: scripts/verify-provider-sandbox-readiness.mjs
consumes: []
```

Implement a no-mutation verifier for the local LPM-007 provider sandbox
readiness contracts that already exist in notification domain code, provider
delivery services, provider adapters, webhook verification, staged migrations,
route handlers, and focused tests. The verifier must prove, from repository
source, that provider sends remain approval-gated, adult-recipient allowlisting
and suppression are explicit, sandbox adapters are bound by durable authority,
signed webhooks update attempts without conflating acceptance/delivery/read/
acknowledgment, and retry/reconciliation behavior is idempotent before any
operator runs real sandbox email, SMS, or Web Push proof.

The tool must not call Supabase, sign in, run Playwright, seed data, mutate
hosted records, send email/SMS/Web Push, call SendGrid, Twilio, Pingram, Web
Push, or provider dashboards, configure secrets, deploy, or claim sandbox,
hosted, provider, or production acceptance. Its job is to make the local
readiness contract executable and to name exact blockers before an operator runs
approved sandbox-provider proof.

### Acceptance Criteria

- A new `qa:provider-sandbox-readiness` script reads only repository files and
  fails with named blockers when an LPM-007 local readiness contract is
  missing or weakened.
- The verifier checks provider approval authority: notification review requires
  assigned coach or organization-admin authority, matching provider/channel,
  organization feature gate, recipient preference checks, durable attempt rows,
  and no external send during review.
- The verifier checks sandbox adapter binding: worker execution claims queued
  approved attempts, rechecks durable authority, binds attempt, notification,
  channel, provider, transport provider, idempotency key, retry count, and
  adapter selection before any adapter send can run.
- The verifier checks suppression and allowlist/cost controls: rejected,
  preference-disabled, provider-disabled, unknown SMS provider, opt-out, and
  missing provider configuration paths suppress without retry; docs name
  adult-consented QA allowlists, cost caps, monitoring, and rollback before
  provider proof.
- The verifier checks webhook security: SendGrid signed event webhook
  verification, Twilio request validation, Pingram timestamp/HMAC verification,
  duplicate callback/event handling, and replay protection are present in code
  and tests.
- The verifier checks delivery truth separation: provider accepted, delivered,
  failed, read, acknowledged, suppressed, indeterminate, retry, and dead-letter
  states remain distinct; SendGrid/Twilio/Pingram callbacks never make
  synchronous send acceptance equal delivery or family acknowledgment.
- The verifier explicitly names real sandbox sends, provider dashboard setup,
  secrets, adult QA recipient approval, signed webhook endpoint registration,
  hosted worker execution, cost monitoring, and production-send approval as open
  gates.
- Tests cover passing fixtures and at least one missing-contract failure for
  each readiness family without requiring hosted credentials or network access.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  readiness proof only; real sandbox sends, hosted worker proof, provider
  dashboard setup, provider secrets, signed webhook registration, cost
  monitoring, and production-send approval remain open gates.
