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
- LPM-015 integrated in AgentFlow build
  `build_ad6a0617-4f9b-4736-be48-1f6022264149` at integration commit
  `b2a25e822b0c9f08f41901807d3010075cb2dd9d`.
- LPM-016 integrated in AgentFlow build
  `build_56df39d6-071b-47ae-8b81-f00ce8853c1b` at integration commit
  `12a0aa5db04a269b9efab7d76dcca671865820ae`.
- LPM-017 integrated in AgentFlow build
  `build_a62e498a-7316-43a4-b7c6-1569c62960d8` at integration commit
  `944366ff9e5fcee72ba3f4037ce68fa0c2f306b9`.
- LPM-018 integrated in AgentFlow build
  `build_faa1c28e-cc9d-4912-9529-0df1240963da` at integration commit
  `50e56d2d33cd04dc869483a1f99b6583fd9cc36b`.
- LPM-019 integrated in AgentFlow build
  `build_540e44fe-150e-455c-bd70-678b51491db9` at integration commit
  `42b69b1b122bc150302ad62c4337d74f40907dc7`.

Continued execution invariant: continued one-task-at-a-time execution accepts exactly one executable queue heading, either LPM-013A or LPM-014 or later. LPM-001 through LPM-012 remain completed records only; LPM-001 through LPM-012 A-variants must not be reintroduced as executable headings.

## LPM-020 - Prove deployed public configuration in the browser harness

```yaml
estimate_hours: 4
depends_on: []
owns:
  - docs/agentflow-missing-production-backlog.md
  - app/registration/page.tsx
  - components/feature-panels.tsx
  - components/feature-panels.test.tsx
  - scripts/public-family-proof-contract.mjs
  - scripts/public-family-proof-contract.test.mjs
  - scripts/capture-public-family-phase0-proof.mjs
  - scripts/verify-hosted-readiness-preflight.mjs
  - scripts/verify-hosted-readiness-preflight.test.mjs
  - docs/Features.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
  - docs/runbook.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/public-family-proof-contract.test.mjs
  - node --test scripts/verify-hosted-readiness-preflight.test.mjs
  - npm test -- components/feature-panels.test.tsx app/route-guards.test.ts
  - npm run qa:local-readiness-ledger
  - node --test scripts/verify-local-readiness-ledger.test.mjs
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: hosted-public-configuration-proof-contract
    type: browser-proof-contract
    version: 1.0.0
    path: scripts/public-family-proof-contract.mjs
consumes: []
```

Close the local proof-contract gap between LPM-002 preflight and its hosted
browser run. The preflight currently validates an intended organization UUID
and review window, but its follow-on public-family command drops those expected
values. The browser harness checks that obvious demo and archived teams are
absent, but it cannot prove that the deployed registration route used the exact
intended organization or a configured review window instead of fallback copy.

Add non-secret, machine-readable evidence to the registration route for the
configured public organization and review window. The organization evidence
must be an irreversible short SHA-256 fingerprint, not the raw UUID. It is
proof metadata only and must not become authorization, tenant selection, or
client-side configuration authority. The server remains the only source of the
environment values.

Add a pure public-family proof contract that distinguishes local from hosted
targets, validates required hosted expectations, computes the expected
organization fingerprint, and fails closed when rendered evidence is absent or
mismatched. Update the browser harness to use that contract only for hosted
targets, verify the exact fingerprint, verify that the review window was
configured, and verify that the expected review-window copy was rendered.
Record only the fingerprint and boolean/match results in `proof.json`; do not
record QA credentials, Supabase keys, cookies, tokens, or the raw organization
UUID.

Update the no-mutation preflight follow-on public-family command so it carries
the same intended organization UUID and review window into the local proof
process. Preserve shell-safe rendering. Local browser proof must continue to
work without either hosted expectation and must not be relabeled hosted proof.

Update the feature inventory, work plan, production board, and runbook to state
that the local harness can prove deployed public-configuration use after the
new code is deployed and run. Keep LPM-002 at
`local repository readiness complete - external proof open`: this task does not
deploy the code or run the production browser proof.

This task must not change public copy, registration mutation behavior, team
selection, Supabase adapters, RLS, migrations, providers, payments, storage, or
role authority. It must not call Supabase, Vercel, Stripe, provider dashboards,
email, SMS, push, storage/scanner services, or app stores; read or configure
secrets; seed or mutate hosted records; run hosted browser proof; deploy; push;
or claim hosted/provider/payment/storage/accessibility/production acceptance.

### Acceptance Criteria

- The queue records LPM-019 with AgentFlow build
  `build_540e44fe-150e-455c-bd70-678b51491db9` and integration commit
  `42b69b1b122bc150302ad62c4337d74f40907dc7`.
- The registration Server Component derives proof metadata from server
  environment values and passes only a short SHA-256 organization fingerprint
  plus review-window-configured state to the client component.
- The rendered registration root exposes stable machine-readable evidence for
  the fingerprint and review-window-configured state without exposing the raw
  organization UUID.
- The proof contract classifies loopback and `.local` targets as local, requires
  valid organization and review-window expectations for hosted targets, and
  emits explicit blockers for missing or mismatched rendered evidence.
- Direct Node tests cover local mode, valid hosted mode, invalid UUID, missing
  review window, fingerprint mismatch, missing configured-state evidence, and
  rendered review-window mismatch.
- The public-family browser harness applies hosted configuration assertions only
  to hosted targets and records no raw UUID, credentials, keys, cookies, or
  tokens in `proof.json`.
- The hosted preflight's public-family follow-on command shell-safely carries
  `PUBLIC_ORGANIZATION_ID` and `PUBLIC_ACCESS_REVIEW_WINDOW`; its tenant
  readiness command and no-mutation boundaries remain unchanged.
- Component tests prove the evidence attributes and unchanged family-facing
  review-window copy. Existing public organization scoping tests continue to
  pass.
- Local public-family proof remains runnable without hosted expectation
  variables and is not represented as hosted proof.
- The feature inventory, LPM-002 work-plan row, production board, and runbook
  describe the new proof contract without claiming deployment or hosted
  acceptance.
- LPM-002 remains `local repository readiness complete - external proof open`;
  deployment, current Vercel value readback, hosted public browser evidence,
  signed-in tenant readiness, Supabase readback, RLS, accessibility, and
  production acceptance remain separate gates.
- The local readiness ledger, direct proof-contract tests, focused component
  and route tests, skill check, typecheck, build, and whitespace check pass.
