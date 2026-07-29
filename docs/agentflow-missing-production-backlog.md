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

## LPM-004A - Add admin proof closure readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-admin-proof-closure-readiness.mjs
  - scripts/verify-admin-proof-closure-readiness.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-admin-proof-closure-readiness.test.mjs
  - npm test -- app/public-intake-rate-limit.test.ts lib/supabase/reporting.test.ts lib/supabase/sponsor-operations.test.ts app/api-live-actions.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: admin-proof-closure-readiness-verifier
    type: local-readiness-proof
    version: 1.0.0
    path: scripts/verify-admin-proof-closure-readiness.mjs
consumes: []
```

Implement a no-mutation verifier for the local LPM-004 admin proof closure
contracts that already exist in route handlers, Supabase adapters, staged
migrations, and focused tests. The verifier must prove, from repository source,
that media report, media moderation, team-builder publish, broader admin scope,
and public intake abuse-control seams are present and still bounded before
later hosted browser and Supabase readback proof.

The tool must not call Supabase, sign in, run Playwright, seed data, mutate
hosted records, send providers, deploy, configure edge firewalls, or claim
hosted acceptance. Its job is to make the local readiness contract executable
and to name exact blockers before an operator runs hosted QA proof.

### Acceptance Criteria

- A new `qa:admin-proof-readiness` script reads only repository files and fails
  with named blockers when an LPM-004 local readiness contract is missing or
  weakened.
- The verifier checks media report source authority: report routes use
  authenticated route identity, reach the Supabase operation layer, require
  media/team scope, increment/report moderation state, and do not reveal
  unrelated team media.
- The verifier checks media moderation source authority: moderation routes use
  authenticated actor context, allowed hide/restore/remove decisions, audit or
  moderation evidence, and scoped Supabase service behavior.
- The verifier checks team-builder publish readiness: admin publish or live
  action tests cover preview/approval/publish semantics, persisted plan or audit
  evidence, organization scoping, idempotency, and no cross-org writes.
- The verifier checks broader admin scope readiness: reporting/export or admin
  service tests prove selected-organization scoping and prevent unrelated
  tenant rows from entering admin reads or exports.
- The verifier checks public intake abuse controls: registration and telemetry
  public routes use the shared fixed-window limiter and return `429`,
  `Retry-After`, and `X-RateLimit-*` headers in focused tests, while explicitly
  naming hosted edge/shared-store proof as still open.
- Tests cover passing fixtures and at least one missing-contract failure for
  each readiness family without requiring hosted credentials or network access.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  readiness proof only; hosted UI proof, Supabase readback, and deployed
  edge/shared-store rate-limit proof remain open gates.
