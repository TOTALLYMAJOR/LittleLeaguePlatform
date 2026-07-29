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

## LPM-003 - Add access lifecycle authority verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-access-lifecycle-authority.mjs
  - scripts/verify-access-lifecycle-authority.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-access-lifecycle-authority.test.mjs
  - npm test -- app/api-registration-review.test.ts app/api-invite-acceptance.test.ts app/api-additional-guardians.test.ts lib/supabase/registration-approvals.test.ts lib/supabase/invite-acceptance.test.ts lib/supabase/additional-guardians.test.ts lib/supabase/guardian-links.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: access-lifecycle-authority-verifier
    type: local-authority-proof
    version: 1.0.0
    path: scripts/verify-access-lifecycle-authority.mjs
consumes: []
```

Implement a no-mutation verifier for the LPM-003 access lifecycle authority
contracts that already exist in route handlers, Supabase adapters, and staged
migrations. The verifier must prove, from repository source, that registration
review, parent invite acceptance, guardian link repair, and additional guardian
review are session-derived, review-gated, scope-bounded, audited where
consequential, and provider-free until a separate approved send slice runs.

The tool must not call Supabase, sign in, run Playwright, send providers, seed
data, mutate hosted records, deploy, or claim hosted acceptance. Its job is to
make the local authority contract executable before later hosted browser and
Supabase readback proof.

### Acceptance Criteria

- A new `qa:access-lifecycle-authority` script reads only repository files and
  fails with named blockers when an authority contract is missing or weakened.
- The verifier checks that registration approval/rejection uses the verified
  admin session, requires review evidence, creates only a manual one-time invite
  or existing-parent activation, and does not trigger provider sends.
- The verifier checks that invite preview/acceptance uses hashed one-time
  tokens, rejects invalid/already-accepted/expired/revoked/wrong-account cases,
  activates only the preapproved child/team scope, and records provider-free
  audit evidence.
- The verifier checks that guardian repair requires active organization-admin
  access, an existing parent profile, organization-matched player scope, bounded
  verification evidence, and an audit row.
- The verifier checks that additional guardian approval is admin-reviewed,
  provider-free, restricted to `standard_linked_guardian_access`, and does not
  grant custody, medical, transport, schedule-edit, publishing, or
  onward-delegation authority.
- Tests cover passing fixtures and at least one missing-contract failure for
  each lifecycle family without requiring hosted credentials or network access.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  proof only; hosted UI proof and Supabase readback remain open gates.
