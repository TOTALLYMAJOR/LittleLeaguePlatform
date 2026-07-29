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

## LPM-008A - Add private media storage readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-private-media-storage-readiness.mjs
  - scripts/verify-private-media-storage-readiness.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-private-media-storage-readiness.test.mjs
  - npm test -- app/api-auth.test.ts app/api-family-replays.test.ts lib/supabase/family-replays.test.ts components/family-parent-replay.test.tsx app/dashboard-read-adapters.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: private-media-storage-readiness-verifier
    type: local-readiness-proof
    version: 1.0.0
    path: scripts/verify-private-media-storage-readiness.mjs
consumes: []
```

Implement a no-mutation verifier for the local LPM-008 private media storage
and scanner readiness contracts that already exist in media upload routes,
private-media services, team/family read adapters, Parent Replay migration
contracts, privacy docs, and focused tests. The verifier must prove, from
repository source, that private uploads remain disabled by default behind both
environment and organization gates, tenant/team quarantine object paths are
authoritatively derived after role checks, scanner evidence requires size,
magic-byte, hash, decode/re-encode, metadata stripping, malware/inappropriate
content proof, and failed scans stay quarantined before any family-visible
release path can run.

The tool must not call Supabase, sign in, run Playwright, seed data, mutate
hosted records, upload media, create storage objects, download objects, call a
scanner, call provider dashboards, configure secrets, deploy, or claim hosted,
storage-provider, scanner-provider, or production acceptance. Its job is to
make the local readiness contract executable and to name exact blockers before
an operator runs approved private storage, scanner, consent, deletion, hosted,
or production proof.

### Acceptance Criteria

- A new `qa:private-media-storage-readiness` script reads only repository files
  and fails with named blockers when an LPM-008 local readiness contract is
  missing or weakened.
- The verifier checks upload gates and authority: upload initiation and
  completion require authenticated route users, assigned coach or
  organization-admin authority, a server kill switch, an organization feature
  flag, and proven scanner configuration before any storage token or scan path
  can succeed.
- The verifier checks tenant-scoped quarantine storage: object paths include
  organization id, team id, a quarantine prefix, a generated identifier, and
  allowed image extensions; route responses and docs keep quarantine distinct
  from family-visible media.
- The verifier checks scanner and processing evidence: allowed MIME types,
  size limits, SHA-256 validation, magic-byte validation, image decode,
  rotation/re-encode with EXIF stripping, scanner endpoint/token/provider
  readiness, scan evidence id, processed-path write, and original quarantine
  removal are present before `scan_completed_at`.
- The verifier checks family release and read-time privacy: release requires
  scan evidence, admin authority, approved moderation, complete subject
  identity, every active guardian's current consent, accessible alt text or
  transcript, family-release approval, and family read adapters suppress draft,
  unscanned, revoked, deleted, or unapproved media.
- The verifier checks retention, deletion, and takedown evidence: retention
  deadlines, storage deletion timestamps/evidence, review history, report and
  moderation APIs, and deletion-proof language are present before any production
  media-storage claim.
- The verifier explicitly names storage-provider setup, scanner-provider setup,
  hosted signed-upload proof, hosted scan proof, populated consent/revocation
  proof, deletion/retention proof, abuse/takedown proof, accessibility proof,
  and production acceptance as open gates.
- Tests cover passing fixtures and at least one missing-contract failure for
  each readiness family without requiring hosted credentials or network access.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  readiness proof only; private storage setup, scanner setup, hosted upload and
  scan proof, populated consent/revocation proof, deletion/retention proof,
  abuse/takedown proof, accessibility proof, and production acceptance remain
  open gates.
