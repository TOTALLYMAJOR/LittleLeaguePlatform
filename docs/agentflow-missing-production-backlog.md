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

## LPM-006A - Add family season continuity readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-family-season-continuity-readiness.mjs
  - scripts/verify-family-season-continuity-readiness.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-family-season-continuity-readiness.test.mjs
  - npm test -- lib/supabase/family-replays.test.ts lib/supabase/season-transitions.test.ts components/family-parent-replay.test.tsx components/season-transition-review.test.tsx app/api-family-replays.test.ts app/api-season-transitions.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: family-season-continuity-readiness-verifier
    type: local-readiness-proof
    version: 1.0.0
    path: scripts/verify-family-season-continuity-readiness.mjs
consumes: []
```

Implement a no-mutation verifier for the local LPM-006 Family Replay and season
continuity contracts that already exist in route handlers, Supabase adapters,
staged migrations, family replay UI, season-transition UI, and focused tests.
The verifier must prove, from repository source, that private family replay,
media consent and revocation, private engagement, season transition review, and
downstream refusal seams are present and still bounded before later hosted
browser and Supabase readback proof.

The tool must not call Supabase, sign in, run Playwright, seed data, mutate
hosted records, create provider sends, upload media, create storage objects,
deploy, configure storage/scanner/realtime/provider infrastructure, or claim
hosted acceptance. Its job is to make the local readiness contract executable
and to name exact blockers before an operator runs hosted QA proof.

### Acceptance Criteria

- A new `qa:family-season-continuity-readiness` script reads only repository
  files and fails with named blockers when an LPM-006 local readiness contract is
  missing or weakened.
- The verifier checks Parent Replay read authority: family reads require a
  signed-in parent, active guardian links, current child/team scope, queued
  published replay status, first-name plus last-initial child labels, and no
  coach/admin/private draft leakage.
- The verifier checks replay media consent and revocation: media publication
  requires subject player identity, every current guardian consent, approved
  moderation, scan/family-release evidence for private media, accessible
  alt/transcript copy, and read-time revocation/deletion suppression.
- The verifier checks private engagement: save, view, and activity-completed
  rows are parent-scoped, private to the family, provider-free, and never used
  for child/family ranking.
- The verifier checks season transition authority: proposals require
  organization-admin authority, every current guardian review, lock-version
  concurrency, expiration state, fixed carry-forward/reset fields, audit
  evidence, and provider-free state changes.
- The verifier checks apply/revert/downstream refusal: applying a transition
  archives only the source roster, creates provenance-linked target player
  truth, refuses deletion after downstream family activity, and keeps revert or
  correction service-only with audit history.
- The verifier explicitly names hosted browser proof, Supabase readback,
  populated media consent/revocation proof, multi-guardian transition
  concurrency proof, storage/scanner proof, provider sandbox proof, and
  production acceptance as open gates.
- Tests cover passing fixtures and at least one missing-contract failure for
  each readiness family without requiring hosted credentials or network access.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  readiness proof only; hosted UI proof, Supabase readback, storage/scanner
  proof, provider sandbox, multi-guardian populated proof, and production
  acceptance remain open gates.
