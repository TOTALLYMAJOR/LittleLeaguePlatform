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

## LPM-010A - Add sponsor fulfillment readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-sponsor-fulfillment-readiness.mjs
  - scripts/verify-sponsor-fulfillment-readiness.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-sponsor-fulfillment-readiness.test.mjs
  - npm test -- lib/domain/domain.test.ts lib/supabase/sponsors.test.ts lib/supabase/sponsor-operations.test.ts components/sponsor-hub.test.tsx app/api-live-actions.test.ts app/routes-smoke.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: sponsor-fulfillment-readiness-verifier
    type: local-readiness-proof
    version: 1.0.0
    path: scripts/verify-sponsor-fulfillment-readiness.mjs
consumes: []
```

Implement a no-mutation verifier for the local LPM-010 sponsor fulfillment
readiness contracts that already exist in sponsor placement domain helpers,
team portal/community commerce models, Supabase sponsor reads, admin sponsor
operations, Sponsor Hub fulfillment/report UI, public sponsor privacy copy,
feature documentation, and focused tests. The verifier must prove, from
repository source, that active sponsors render only through approved placement
filters, approved logo assets are distinct from submitted logo URLs, fulfillment
and recap surfaces separate configured placement, observed rendering proof,
billing proof, renewal state, and unproven impact, and public surfaces do not
leak child, parent, private media, billing, or redemption proof.

The tool must not call Supabase, sign in, run Playwright, seed data, mutate
hosted records, send renewal email, call email/SMS/push providers, call Stripe,
create or refund payments, upload files, fetch external logo assets, call
provider dashboards, deploy, or claim hosted, observed-rendering, provider,
finance, or production acceptance. Its job is to make the local readiness
contract executable and to name exact blockers before an operator runs approved
hosted public/admin browser proof, logo asset proof, placement rendering proof,
renewal delivery proof, report proof, or production sponsor acceptance.

### Acceptance Criteria

- A new `qa:sponsor-fulfillment-readiness` script reads only repository files
  and fails with named blockers when an LPM-010 local readiness contract is
  missing or weakened.
- The verifier checks placement authority: public placement helpers filter to
  `active` sponsor records and exact approved placement keys, team-portal
  placement respects team scope, and admin save operations reject invalid
  placement keys, wrong-organization team assignments, and unauthorized actor
  writes.
- The verifier checks logo and asset safety: Supabase reads only approved logo
  assets, submitted logo URLs remain review inputs until approved, unavailable
  sponsor data fails closed without restoring editable seed rows, and the UI
  gives clear fallback states when artwork or placement evidence is missing.
- The verifier checks fulfillment and recap separation: Sponsor Hub and revenue
  summaries separate configured public placement, reviewed logo metadata,
  billing/payment proof, renewal review, report export, delivered-placement
  proof, and unproven impact; zero verified impact is not converted into an
  impact claim or PDF report.
- The verifier checks renewal delivery gates: renewal email is human-reviewed
  and remains disconnected from provider sends unless the provider sandbox
  delivery contract and channel-specific consent/webhook proof are separately
  complete.
- The verifier checks public and parent privacy: `/sponsors`, team portal, and
  parent-facing data paths do not expose sponsor billing state, child profiles,
  parent contacts, private media, redemption proof, or sponsor-attributed
  impact.
- The verifier explicitly names hosted public/admin browser proof, observed
  placement-rendering proof, approved logo asset proof, sponsor recap/report
  artifact proof, renewal email sandbox proof, public placement leak QA,
  accessibility proof, finance reconciliation, and production sponsor
  acceptance as open gates.
- Tests cover passing fixtures and at least one missing-contract failure for
  each readiness family without requiring hosted credentials, network access,
  Supabase, browser automation, provider dashboard access, provider sends,
  Stripe, storage, or external logo requests.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  readiness proof only; hosted public/admin browser proof, observed
  placement-rendering proof, approved logo asset proof, sponsor recap/report
  artifact proof, renewal email sandbox proof, public placement leak QA,
  accessibility proof, finance reconciliation, and production sponsor
  acceptance remain open gates.
