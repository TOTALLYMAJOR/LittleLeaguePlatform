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

## LPM-014 - Add team-builder player age and evaluation metadata

```yaml
estimate_hours: 4
depends_on: []
owns:
  - lib/domain/season-planning.ts
  - lib/domain/contracts.ts
  - lib/domain/domain.test.ts
  - components/feature-panels.tsx
  - components/feature-panels.test.tsx
  - supabase/migrations/0034_team_builder_player_metadata.sql
  - docs/Features.md
  - docs/capability-matrix.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
  - docs/agentflow-missing-production-backlog.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - npm test -- lib/domain/domain.test.ts components/feature-panels.test.tsx supabase/rls-policy.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: team-builder-player-metadata-contract
    type: local-product-contract
    version: 1.0.0
    path: lib/domain/season-planning.ts
consumes: []
```

Implement LP-008 as a local repository slice by adding explicit Team Builder
player age and evaluation metadata to the automatic team-builder contract. The
current preview already supports sibling/guardian grouping, friend requests,
target-roster warnings, skill-balance scoring, and admin-only publish authority,
but it still says skill ratings default until imported and age is represented by
division only. Replace that gap with typed, admin-scoped metadata that can inform
preview ordering and review notes without exposing private child detail to
parents or claiming hosted team-builder proof.

This task may add a local Supabase migration file, domain types, route-surface
display copy, tests, and documentation. It must not apply migrations to any
hosted database, seed or mutate Supabase data, run browser proof, push, deploy,
create provider sends, touch Stripe, upload media, configure secrets, or claim
hosted/provider/production acceptance.

### Acceptance Criteria

- Domain contracts accept explicit age-band, birthdate-derived age label, and
  player evaluation inputs without requiring private full birthdates in preview
  output.
- `previewBalancedTeamBuild` uses explicit evaluation ratings when supplied,
  keeps sibling/friend groups together, surfaces age-band and evaluation review
  notes per player, and removes stale warnings that age/skill are unavailable
  once metadata exists.
- Admin UI copy shows the metadata as a review input for roster fairness while
  keeping public/family display limited to privacy-safe player names and
  non-sensitive notes.
- A new migration extends team-builder persistence for player metadata or plan
  constraints in an idempotent, admin-only, backward-compatible way; it does not
  weaken existing RLS or expose child data.
- Tests prove evaluation and age-band metadata influence local preview output,
  publish still requires an organization admin, and privacy-safe display remains
  first name plus last initial.
- Docs move LP-008 from an open production gap to local implementation complete
  while keeping hosted browser publish proof, Supabase readback, migration apply,
  cross-org proof, and production acceptance open.
