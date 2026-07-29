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

## LPM-005A - Add game-day communication readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-game-day-communication-readiness.mjs
  - scripts/verify-game-day-communication-readiness.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-game-day-communication-readiness.test.mjs
  - npm test -- lib/supabase/game-day-resolution.test.ts lib/supabase/official-communications.test.ts components/communication-room.test.tsx app/api-official-communications.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: game-day-communication-readiness-verifier
    type: local-readiness-proof
    version: 1.0.0
    path: scripts/verify-game-day-communication-readiness.mjs
consumes: []
```

Implement a no-mutation verifier for the local LPM-005 game-day and official
communication contracts that already exist in route handlers, Supabase adapters,
staged migrations, offline helpers, family communication UI, and focused tests.
The verifier must prove, from repository source, that game-day decisions,
official corrections and withdrawals, current-version family readback, and
offline/reconnect conflict seams are present and still bounded before later
hosted browser and Supabase readback proof.

The tool must not call Supabase, sign in, run Playwright, seed data, mutate
hosted records, create provider sends, deploy, configure realtime/provider
infrastructure, or claim hosted acceptance. Its job is to make the local
readiness contract executable and to name exact blockers before an operator runs
hosted QA proof.

### Acceptance Criteria

- A new `qa:game-day-communication-readiness` script reads only repository files
  and fails with named blockers when an LPM-005 local readiness contract is
  missing or weakened.
- The verifier checks game-day decision authority: the POST route derives the
  actor from `requireAuthenticatedRouteUser`, accepts only monitor, confirm,
  delay, and cancel decisions, forwards an idempotency key, and the Supabase
  service requires assigned coach or organization-admin authority before
  recording a review.
- The verifier checks schedule-version binding and audit evidence: decision and
  official-message services or migrations bind work to event or schedule
  version truth, create durable review/version/audit evidence, and create
  pending or in-app recipient records only.
- The verifier checks official communication revision authority: publish,
  correction, and withdrawal paths use the authenticated actor, expected thread
  version, expected schedule version, idempotency key, immutable version rows,
  and suppress superseded recipient/projection records.
- The verifier checks family current-version readback: Communication Room or
  receipt projection code renders official revision truth, current version
  number, schedule version, correction history, partial-propagation warnings,
  and required ready projection counts without treating provider delivery as
  acknowledgment.
- The verifier checks offline/reconnect conflict behavior: local offline
  game-day outbox code and tests preserve client action IDs, schedule versions,
  conflict/degraded states, and no silent overwrite of newer server truth.
- The verifier explicitly names hosted browser proof, Supabase readback,
  populated one-version family projection, provider sandbox/webhook proof, and
  realtime/offline production behavior as open gates.
- Tests cover passing fixtures and at least one missing-contract failure for
  each readiness family without requiring hosted credentials or network access.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  readiness proof only; hosted UI proof, Supabase readback, provider sandbox,
  realtime/offline production proof, and production acceptance remain open gates.
