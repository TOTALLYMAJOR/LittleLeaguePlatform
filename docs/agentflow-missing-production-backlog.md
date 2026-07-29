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

## LPM-002A - Add hosted readiness preflight gate

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-hosted-readiness-preflight.mjs
  - scripts/verify-hosted-readiness-preflight.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-hosted-readiness-preflight.test.mjs
  - npm test -- app/routes-smoke.test.ts lib/navigation/route-topology.test.ts lib/supabase/tenant-readiness.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: hosted-readiness-preflight
    type: local-proof-preflight
    version: 1.0.0
    path: scripts/verify-hosted-readiness-preflight.mjs
consumes: []
```

Implement a no-mutation preflight gate for LPM-002 hosted public and tenant
readiness proof. The gate must validate that the operator has supplied an
explicit hosted base URL, public organization configuration, review-window
configuration, and QA proof command inputs before running browser proof against
a hosted deployment. It builds on the already-integrated LPM-001 baseline
ledger rather than consuming a task in this new one-task plan.

The tool must not deploy, bypass Vercel Authentication, seed Supabase, mutate
hosted data, send providers, write payments, upload media, or claim production
acceptance. Its job is to fail early with actionable blockers and print the
exact commands that remain human/operator-run after credentials and hosted URL
are confirmed.

### Acceptance Criteria

- A new `qa:hosted-readiness-preflight` script validates the required hosted
  proof inputs without making network, provider, database, payment, storage, or
  deployment mutations.
- The preflight rejects missing or invalid `QA_PROOF_BASE_URL`,
  `PUBLIC_ORGANIZATION_ID`, and `PUBLIC_ACCESS_REVIEW_WINDOW`, and it
  distinguishes local proof from hosted proof.
- When inputs are valid, the preflight prints the exact follow-on commands for
  `npm run qa:public-family-proof` and `npm run qa:tenant-readiness-proof`
  using the supplied hosted URL, while explicitly preserving provider-send,
  payment, media, migration, and production-acceptance boundaries.
- Tests cover missing inputs, invalid URL, localhost/local-only mode, valid
  hosted mode, and command output. They must not require real hosted
  credentials or network access.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the preflight as a blocker-clearing
  gate, not hosted acceptance itself.
