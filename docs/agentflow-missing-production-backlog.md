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

## LPM-011A - Add reporting archive readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-reporting-archive-readiness.mjs
  - scripts/verify-reporting-archive-readiness.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-reporting-archive-readiness.test.mjs
  - npm test -- lib/supabase/reporting.test.ts app/api-auth.test.ts app/routes-smoke.test.ts components/feature-panels.test.tsx
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: reporting-archive-readiness-verifier
    type: local-readiness-proof
    version: 1.0.0
    path: scripts/verify-reporting-archive-readiness.mjs
consumes: []
```

Implement a no-mutation verifier for the local LPM-011 reporting and archive
readiness contracts that already exist in the admin export route, Supabase
reporting service, reporting tests, archive vault surface, archive readiness
checklist, privacy/security docs, capability matrix, and user manual. The
verifier must prove, from repository source, that active organization admins are
the only export actors, each supported export kind is scoped through the
selected organization or organization-derived team/player/event sets, related
profile lookups are narrowed before contact data is joined, export generation
writes audit evidence, archive surfaces stay admin-only, archived seasons remain
readable and mutation-locked, and chat text retention/deletion proof is kept
separate from non-chat season preservation.

The tool must not call Supabase, sign in, run Playwright, seed data, mutate
hosted records, run archive close, delete chat records, call provider
dashboards, upload or download files, deploy, configure secrets, or claim hosted
RLS, browser, retention, restore, or production acceptance. Its job is to make
the local readiness contract executable and to name exact blockers before an
operator runs approved hosted admin export proof, archive smoke proof,
chat-retention cleanup proof, backup/restore proof, or production archive
acceptance.

### Acceptance Criteria

- A new `qa:reporting-archive-readiness` script reads only repository files and
  fails with named blockers when an LPM-011 local readiness contract is missing
  or weakened.
- The verifier checks export authority: `/api/admin/exports` requires an
  authenticated route user, accepts only the eight supported export kinds, and
  `createAdminExport` rejects missing organization/actor context and requires
  an active organization-admin membership for the selected organization before
  reading export data.
- The verifier checks export isolation: roster, contacts, schedule, RSVP,
  snacks, volunteers, sponsors, and notifications export rows are scoped by
  organization or by organization-derived team, player, and event ID sets before
  related rows are read; profile joins are limited to collected IDs from those
  scoped rows.
- The verifier checks audit and file truth: successful exports insert an
  `admin_export_created` audit event, return CSV content with a deterministic
  filename/content type, escape CSV values, and fail closed when Supabase is
  unavailable.
- The verifier checks archive safety: the reports/archive and archive routes
  remain admin-only, archive vault copy keeps archived seasons readable,
  exportable, and mutation-locked, and fallback archive data is labeled as local
  until Supabase rows are available.
- The verifier checks retention separation: docs require non-chat season data
  preservation, chat retention cleanup before archive proof, deletion proof
  that app-readable `team_chat_messages` text is gone, and retained moderation
  metadata that cannot reconstruct deleted message bodies.
- The verifier explicitly names hosted RLS/admin export proof, hosted archive
  smoke proof, real season-close proof, chat-retention cleanup proof,
  deleted-chat readback proof, backup/PITR/restore proof, accessibility proof,
  and production archive acceptance as open gates.
- Tests cover passing fixtures and at least one missing-contract failure for
  each readiness family without requiring hosted credentials, network access,
  Supabase, browser automation, provider dashboard access, archive close, chat
  deletion, backups, restore drills, storage, or external file requests.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  readiness proof only; hosted RLS/admin export proof, hosted archive smoke
  proof, real season-close proof, chat-retention cleanup proof, deleted-chat
  readback proof, backup/PITR/restore proof, accessibility proof, and production
  archive acceptance remain open gates.
