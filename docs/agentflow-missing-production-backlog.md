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

## LPM-016 - Reconcile sponsor local readiness status

```yaml
estimate_hours: 2
depends_on: []
owns:
  - docs/Features.md
  - docs/capability-matrix.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
  - docs/runbook.md
  - docs/agentflow-missing-production-backlog.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - npm run qa:sponsor-stripe-readiness
  - npm run qa:sponsor-fulfillment-readiness
  - node --test scripts/verify-sponsor-stripe-readiness.test.mjs
  - node --test scripts/verify-sponsor-fulfillment-readiness.test.mjs
  - npm test -- lib/supabase/sponsors.test.ts lib/supabase/sponsor-operations.test.ts components/sponsor-hub.test.tsx app/api-live-actions.test.ts app/provider-boundary.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: sponsor-local-readiness-ledger
    type: documentation-status-ledger
    version: 1.0.0
    path: docs/missing-production-slices-work-plan.md
consumes: []
```

Reconcile the sponsor backlog status after confirming that both sponsor local
readiness verifiers already exist and pass. LPM-009 and LPM-010 should move from
planned to local readiness complete only for the source contracts proven by
`qa:sponsor-stripe-readiness`, `qa:sponsor-fulfillment-readiness`, their
failure-mode tests, and focused sponsor API/service/UI tests.

This task may update documentation and status ledgers only. It must not change
payment, provider, sponsor, Supabase, UI, API, migration, or verifier runtime
code; call Stripe, Supabase, Vercel, provider dashboards, email, SMS, push, or
weather providers; configure secrets; seed or mutate hosted records; run browser
proof; deploy; push; or claim sandbox/hosted/provider/finance/production
acceptance.

### Acceptance Criteria

- Docs explicitly say LPM-009 sponsor Stripe readiness is local repository
  readiness complete for the existing proof-only versus sandbox boundary,
  server-side Checkout Session contract, server-only key handling, webhook
  settlement truth, admin/public privacy separation, and open payment gates.
- Docs explicitly say LPM-010 sponsor fulfillment readiness is local repository
  readiness complete for approved active placement filters, Team Portal scope,
  admin placement authority, approved logo reads, submitted-logo review queues,
  fail-closed sponsor data, fulfillment/report separation, renewal delivery
  gates, public and parent privacy, and open fulfillment gates.
- Docs preserve Stripe sandbox account setup, restricted key creation, webhook
  endpoint registration, signing-secret configuration, sandbox Checkout Session
  proof, signed webhook replay/duplicate proof, refund/failure proof, hosted
  admin proof, finance reconciliation, and production payment approval as open
  gates.
- Docs preserve hosted public/admin browser proof, observed placement-rendering
  proof, approved logo asset proof, sponsor recap/report artifact proof, renewal
  email sandbox proof, public placement leak QA, accessibility proof, finance
  reconciliation, and production sponsor acceptance as open gates.
- Documentation does not claim live Stripe collection, provider sends, hosted
  proof, observed placement rendering, approved logo asset proof, finance
  reconciliation, production payment approval, or production sponsor acceptance.
- The local sponsor readiness verifiers, verifier tests, focused sponsor tests,
  typecheck, build, and whitespace check pass after the reconciliation.
