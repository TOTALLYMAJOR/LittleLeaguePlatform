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
- LPM-007A integrated in AgentFlow build
  `build_b1ea8cf7-a6ed-45e8-88b8-7cf50f38ffb8` at integration commit
  `bd94292720fc8d7ece02f7b2d9989e5d34273b44`.
- LPM-008A integrated in AgentFlow build
  `build_57282bd1-9c97-4a59-8ce5-0f97510dd9fc` at integration commit
  `3089c54c77513f1820eec69bc69ab9d34d5f8c8c`.
- LPM-009A integrated in AgentFlow build
  `build_3888a189-a617-4fbe-b64e-5fc002f30ef2` at integration commit
  `e02940dee117481e46925b9a10180998a159ce5a`.
- LPM-010A integrated in AgentFlow build
  `build_ceede9bf-42ca-4d62-a696-2fba63f5d62b` at integration commit
  `1afe3b4d8feed75e966bc2498fddf3570d4fdd7e`.
- LPM-011A integrated in AgentFlow build
  `build_d1e387bd-3e3a-48f9-9436-56fab08879db` at integration commit
  `36496d82a7fd176354cdf9974d43f005cee9dc09`.
- LPM-012A integrated in AgentFlow build
  `build_35560bcd-d714-4bbf-ad4b-bd555c7337fc` at integration commit
  `f1c27e47ce0fd32cb88ac440544b37271b6b0e88`.
- LPM-013A integrated in AgentFlow build
  `build_e15b91b4-66e7-4ce9-833b-ebed388ac25c` at integration commit
  `1a9141a7da17ad8d69bd478859497d1a01cc399f`.
- LPM-014 integrated in AgentFlow build
  `build_f5e9ab21-386a-4aa4-b769-68a9b980a8f9` at integration commit
  `495c6d7480b9044abd591b652145e155fef8713f`.

## LPM-015 - Add weather provider action readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-weather-provider-readiness.mjs
  - scripts/verify-weather-provider-readiness.test.mjs
  - docs/Features.md
  - docs/capability-matrix.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
  - docs/runbook.md
  - docs/agentflow-missing-production-backlog.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - npm run qa:weather-provider-readiness
  - node --test scripts/verify-weather-provider-readiness.test.mjs
  - npm test -- lib/services/weather/weather.test.ts lib/supabase/weather-draft.test.ts app/api-live-actions.test.ts app/provider-boundary.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: weather-provider-readiness-contract
    type: local-proof-contract
    version: 1.0.0
    path: scripts/verify-weather-provider-readiness.mjs
consumes: []
```

Implement LP-016 as a local repository-readiness slice by adding a weather
provider and action verifier that checks the existing weather service, draft
route, Supabase persistence seam, tests, and docs before hosted credential proof
is attempted. The app already has NWS, Open-Meteo, and optional Tomorrow.io
provider adapters plus draft weather-alert creation, but the production board
still treats hosted credential readiness, credential fallback, parent delivery,
and provider proof as open. Add a fail-closed verifier and test suite that makes
those boundaries executable without making network calls.

This task may add a package script, verifier, verifier tests, and documentation.
It must not call weather providers, Supabase, Vercel, provider dashboards, email,
SMS, push, or Stripe; configure secrets; seed or mutate hosted records; run
browser proof; deploy; push; or claim hosted/provider/production acceptance.

### Acceptance Criteria

- `package.json` exposes `qa:weather-provider-readiness` and the command runs
  without credentials, network access, Supabase calls, browser automation,
  provider sends, provider dashboard calls, deployment, or hosted mutation.
- The verifier checks that the weather provider order stays NWS first,
  Open-Meteo fallback, Tomorrow.io optional/premium, and every provider result is
  forced back to draft alert state before persistence.
- The verifier checks the weather draft route derives the reviewer from the
  authenticated session and the Supabase operation enforces coach/admin
  authority, event/team scope, provider fallback, idempotent/auditable draft
  creation, and provider-send separation.
- The verifier checks docs clearly state hosted weather credential proof,
  fallback behavior, signed-in coach/admin draft proof, Supabase readback, parent
  delivery, provider sandbox/webhook proof, realtime/offline behavior,
  accessibility, and production acceptance remain open gates.
- Tests cover the passing repository-source fixture plus failure modes for
  provider order drift, loss of draft enforcement, caller-supplied reviewer
  authority, missing provider-send separation, and missing open-gate docs.
- Docs move LP-016 to local readiness complete while preserving the distinction
  between local source proof, hosted credential proof, provider delivery proof,
  and production acceptance.
