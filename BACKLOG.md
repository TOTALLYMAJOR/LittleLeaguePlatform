# LeaguePilot backlog closeout

This is the reviewed, executable local closeout queue for the current
migration-40 LeaguePilot baseline. The historical product roadmap is retained
in `docs/legacy-product-roadmap.md`; shipped, hosted, provider-gated, and
decision-gated truth remains governed by `docs/production-task-board.md`.

The queue must not deploy, apply migrations to a hosted project, create provider
sends, enable storage or payments, mutate production data, or broaden child,
guardian, team, or organization authority. Hosted acceptance and product
decisions are reconciled in the final documentation task.

## LP-TEAM-008 - Complete private team-builder inputs and local publish workflow

```yaml
estimate_hours: 14
epic_id: LOCAL-CLOSEOUT
epic_title: Safe local backlog closeout
epic_outcome: Remaining approved local implementation and proof gaps are closed without crossing hosted or provider authority.
depends_on: []
owns:
  - supabase/migrations/
  - supabase/team-builder-production.test.ts
  - lib/domain/season-planning.ts
  - lib/domain/contracts.ts
  - lib/domain/domain.test.ts
  - lib/supabase/team-builder-inputs.ts
  - lib/supabase/team-builder-inputs.test.ts
  - lib/supabase/team-builder-plans.ts
  - lib/supabase/team-builder-plans.test.ts
  - app/api/admin/team-builder-inputs/
  - app/api/admin/team-builder-plans/
  - app/api-team-builder.test.ts
  - components/team-builder-workbench.tsx
  - components/team-builder-workbench.test.tsx
  - app/admin/_surfaces.tsx
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npx vitest run lib/domain/domain.test.ts lib/supabase/team-builder-inputs.test.ts lib/supabase/team-builder-plans.test.ts app/api-team-builder.test.ts components/team-builder-workbench.test.tsx supabase/team-builder-production.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
risk_score: 8
```

Implement the still-missing local portions of LP-008 and LP-007 on the current
lineage. Generate one new timestamped migration with the Supabase CLI. Store
birth date, explicit age band, and bounded player evaluation data in a separate
admin-only profile table; do not add those private fields to parent-readable
`players` rows and do not store free-text evaluations. Preserve existing
players without profiles and make defaulted or missing inputs explicit.

Add organization-admin-scoped read/write services and authenticated route
handlers. The server must derive the actor, verify organization, season, player,
and team consistency, and reject cross-tenant IDs and mass-assigned reviewer
identity. Use the explicit inputs in deterministic preview ordering, balance
summaries, warnings, and audit evidence.

Complete a persisted Preview -> Edit -> Approve -> Publish lifecycle for
`team_build_plans`. Publishing must be an atomic, idempotent, expected-version
operation that verifies the approved assignments, updates only in-scope player
team assignments, records the actor and audit event, and executes no provider
send. Add a real `/admin/teams` workbench with loading, empty, validation,
conflict, success, and retry states. Keep hosted browser/Supabase readback as an
external acceptance gate; this task does not deploy or apply the migration.

### Acceptance Criteria

- A new CLI-generated migration adds an admin-only player team-builder profile
  table and the concurrency/idempotency support needed for atomic plan publish,
  with RLS, least-privilege grants, tenant-consistent foreign keys, and no
  parent/team-portal read path for birth date or evaluation data.
- Only an active organization admin can read or change private inputs, save or
  approve a plan, or publish assignments; forged actor, organization, season,
  team, player, stale version, duplicate action, and cross-tenant requests fail
  closed and leave assignments unchanged.
- Preview and publish use explicit age-band and bounded evaluation values,
  retain sibling/guardian and friend constraints, report missing/defaulted
  profiles, and produce deterministic per-team balance and audit summaries.
- `/admin/teams` supports the complete local reviewed lifecycle with accessible
  loading, empty, error, conflict, and success feedback and never implies hosted
  proof or provider delivery.
- Focused migration, RLS, domain, service, route, and component tests pass; the
  full typecheck and production build pass.

## LP-RLS-001 - Produce the permissive-policy actor-action review

```yaml
estimate_hours: 6
epic_id: LOCAL-CLOSEOUT
epic_title: Safe local backlog closeout
epic_outcome: Remaining approved local implementation and proof gaps are closed without crossing hosted or provider authority.
depends_on: []
owns:
  - scripts/audit-rls-policy-overlaps.mjs
  - scripts/audit-rls-policy-overlaps.test.mjs
  - supabase/rls-policy-overlap-review.sql
  - docs/rls-policy-overlap-review-2026-07-27.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npx vitest run scripts/audit-rls-policy-overlaps.test.mjs
  - node scripts/audit-rls-policy-overlaps.mjs --verify
  - git diff --check
risk_score: 7
```

Turn the remaining Supabase `multiple_permissive_policies` warning set into a
deterministic actor/action review instead of mechanically changing policies.
Reconstruct the final policy catalog from the ordered migration chain and group
permissive policies by schema, table, command, and effective actor. Also provide
a read-only catalog query that can reproduce the matrix against an authorized
Postgres target later.

The migration-40 source audit expects 158 final policies and 35 unique overlap
groups: 34 SELECT and one UPDATE. Seven groups are on tables whose browser grants
were later revoked; the rest require actor/action review. Treat `175 = 35 x 5`
as a role-expansion hypothesis until the live advisor export is compared.

The review must distinguish service-role-only tables from Data API tables,
separate SELECT from write semantics, show policy predicates without secrets or
row data, and assign each group one disposition: intentional separation,
candidate consolidation, or needs hosted/live-role proof. Explain how Supabase
role expansion can produce more advisor warnings than unique semantic groups.
Do not edit any RLS policy or connect to preview/production in this task.

### Acceptance Criteria

- The verifier deterministically reconstructs the current final policy set and
  overlap groups from committed migrations, fails on unparsed policy-changing
  DDL, and emits stable machine-readable and Markdown-friendly output.
- The checked-in review covers every reconstructed overlap group by actor and
  action, identifies service-role-only versus exposed Data API scope, and gives
  an evidence-backed disposition without claiming live-catalog acceptance.
- The read-only SQL query exposes the fields needed to compare static and live
  policy semantics while returning no application rows or secrets.
- No migration, grant, policy, hosted project, provider, or production state is
  changed.

## LP-OFFLINE-001 - Close deterministic offline and reconnect proof

```yaml
estimate_hours: 7
epic_id: LOCAL-CLOSEOUT
epic_title: Safe local backlog closeout
epic_outcome: Remaining approved local implementation and proof gaps are closed without crossing hosted or provider authority.
depends_on: []
owns:
  - lib/offline/game-day-outbox.ts
  - lib/offline/game-day-outbox.test.ts
  - components/offline-sync-status.tsx
  - components/offline-sync-status.test.tsx
  - app/offline/page.tsx
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npx vitest run lib/offline/game-day-outbox.test.ts components/offline-sync-status.test.tsx app/routes-smoke.test.ts
  - npm run typecheck
  - git diff --check
risk_score: 6
```

Refactor the private game-day outbox around an injectable storage boundary so
the real IndexedDB adapter and an in-memory proof adapter exercise the same
reconciliation logic. Preserve the three approved low-authority action types
only. Add deterministic proof for ordered replay, duplicate/idempotent replay,
concurrent sync suppression, network retry, stale record or schedule conflict,
conflict stop, successful removal, context-isolated cache clearing, and logout
clearing.

Expose an accessible offline status summary with truthful queued, retrying,
conflict, and synced states. It must never display payload contents or private
child details and must direct conflicts to online review instead of silently
overwriting server truth. This task uses fakes only; it does not make hosted,
provider, or production calls.

### Acceptance Criteria

- The same storage-neutral sync engine is covered against deterministic
  in-memory storage and remains wired to IndexedDB for the browser.
- Concurrent sync calls cannot send one queued action twice, successful actions
  are removed, transient failures remain retryable, and a 409/stale-version
  conflict stops later actions in that context until human review.
- Per-context clearing cannot delete another family/team context, logout
  clearing removes all private outbox data, and unsupported high-authority
  actions remain rejected.
- The offline route communicates status and review actions accessibly without
  exposing stored payloads or claiming that queued work has reached the server.

## LP-QA-GUARD-001 - Guard every mutating QA script from production

```yaml
estimate_hours: 3
epic_id: LOCAL-CLOSEOUT
epic_title: Safe local backlog closeout
epic_outcome: Remaining approved local implementation and proof gaps are closed without crossing hosted or provider authority.
depends_on: []
owns:
  - scripts/verify-qa-session-paths.mjs
  - scripts/capture-communication-room-record-proof.mjs
  - scripts/bootstrap-demo-tenant.mjs
  - supabase/qa-target-guard.test.ts
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npx vitest run supabase/qa-target-guard.test.ts
  - npm run typecheck
  - git diff --check
risk_score: 8
```

Close the local production-safety gap in three existing scripts that can perform
service-role or browser/API mutations. Reuse the established
`assertIsolatedQaTarget` and `assertServiceRoleCredential` contract before any
Supabase client, browser session, service-role call, auth upsert, or application
mutation is created. Preserve each script's existing explicit confirmation and
cleanup semantics as defense in depth.

### Acceptance Criteria

- QA session proof, communication-record proof, and fictional demo bootstrap
  reject the protected production project and a production-like target before
  creating a client or making a mutable request.
- Service-role scripts validate credential/project binding before mutation and
  never print secret values.
- Static guard coverage fails if any of the three entry points moves client
  creation ahead of the isolated-target and credential checks.
- No QA, preview, production, provider, or hosted script is executed as part of
  this task.

## LP-RLS-PROOF-002 - Add guarded actor-action and Realtime proof harnesses

```yaml
estimate_hours: 9
epic_id: LOCAL-CLOSEOUT
epic_title: Safe local backlog closeout
epic_outcome: Remaining approved local implementation and proof gaps are closed without crossing hosted or provider authority.
depends_on:
  - LP-QA-GUARD-001
  - LP-RLS-001
owns:
  - scripts/verify-rls-actor-action-matrix.mjs
  - scripts/verify-realtime-boundaries.mjs
  - supabase/rls-live-proof-harness.test.ts
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npx vitest run supabase/rls-live-proof-harness.test.ts
  - node --check scripts/verify-rls-actor-action-matrix.mjs
  - node --check scripts/verify-realtime-boundaries.mjs
  - git diff --check
risk_score: 9
```

Add reusable, fail-closed proof harnesses for the browser-exposed actor/action
matrix and Realtime authorization. They must refuse protected production,
require an exact isolated QA target and bound service credential, generate
ephemeral two-organization/two-team/multi-family fixtures, and expose explicit
cleanup and evidence plans before mutation.

The actor/action harness must cover correct actor, wrong role, cross-team,
cross-family, and cross-organization reads/writes in domain-sized waves. The
Realtime harness must cover authorized parent/coach subscriptions, wrong-team
event absence, team-filtered insert/update delivery, disconnect/reconnect, and
duplicate/change-version handling. Neither harness may call a provider or print
secrets or private row payloads. This task builds and statically proves the
harnesses but does not execute them against a hosted target.

### Acceptance Criteria

- Both entry points call the isolated-target and credential guards before
  client creation and reject the protected production ref, production-like
  URLs, missing parent-ref evidence, and mismatched service credentials.
- Fixture plans use randomized ephemeral identifiers, create no provider
  records, enumerate expected positive and negative outcomes, and always expose
  cleanup status without deleting pre-existing rows.
- Realtime assertions prove subscription authorization and change isolation
  independently from simple REST reads, including reconnect and duplicate-event
  behavior.
- A dry-run or plan mode emits only redacted fixture counts, checks, and cleanup
  intent; no hosted target is contacted during validation.

## LP-LIFECYCLE-PROOF-001 - Complete the guarded family lifecycle proof harness

```yaml
estimate_hours: 10
epic_id: LOCAL-CLOSEOUT
epic_title: Safe local backlog closeout
epic_outcome: Remaining approved local implementation and proof gaps are closed without crossing hosted or provider authority.
depends_on:
  - LP-QA-GUARD-001
owns:
  - scripts/verify-migration-gap-lifecycle.mjs
  - supabase/migration-gap-lifecycle-proof.test.ts
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npx vitest run supabase/migration-gap-lifecycle-proof.test.ts supabase/qa-target-guard.test.ts
  - node --check scripts/verify-migration-gap-lifecycle.mjs
  - git diff --check
risk_score: 8
```

Extend the existing guarded, provider-free lifecycle harness without running it.
Add explicit cases and cleanup evidence for same-team competing transportation
offers, cross-team and cross-family denial, caregiver expiry and cache clearing,
official communication correction/projection/current-version acknowledgment
and incident resolution, media-consent revocation and retention, multi-guardian
season-transition concurrency, expiration, safe correction, and downstream
refusal.

Each case must distinguish setup, authorized mutation, denied mutation,
readback, audit evidence, notification-draft count, provider-send count, and
cleanup. Expected denials must fail closed without leaving partial rows. The
harness must continue to reject protected production before client creation and
must not introduce provider credentials or production authority.

### Acceptance Criteria

- Every listed lifecycle has positive, wrong-actor or wrong-scope, concurrency
  or stale-version, audit/readback, zero-provider-send, and cleanup assertions.
- Competing offers and multi-guardian transitions prove one final outcome under
  concurrency while preserving rejected/expired evidence.
- Cache clearing, expiration, consent revocation, correction, and downstream
  refusal are independently asserted instead of inferred from a success path.
- Static tests prove the production guard precedes client creation and the
  harness is not executed during local validation.

## LP-DOCS-001 - Reconcile product truth and close the local queue

```yaml
estimate_hours: 5
epic_id: LOCAL-CLOSEOUT
epic_title: Safe local backlog closeout
epic_outcome: Remaining approved local implementation and proof gaps are closed without crossing hosted or provider authority.
depends_on:
  - LP-TEAM-008
  - LP-RLS-001
  - LP-OFFLINE-001
  - LP-QA-GUARD-001
  - LP-RLS-PROOF-002
  - LP-LIFECYCLE-PROOF-001
owns:
  - docs/Features.md
  - docs/capability-matrix.md
  - docs/feature-fit-backlog.md
  - docs/production-audit-action-items.md
  - docs/production-task-board.md
  - docs/tech-stack.md
  - docs/backlog-now.md
  - docs/backlog-next.md
  - docs/backlog-closeout-2026-07-27.md
validate:
  - git diff --check
risk_score: 4
```

Complete LP-001 after the implementation tasks integrate. Reconcile all listed
trackers against committed code and evidence, removing stale "apply migration"
and scaffold wording while preserving the difference between local
implementation, local tests, hosted proof, provider operation, and production
acceptance.

Publish one closeout ledger with explicit `done-local`, `external`,
`decision-required`, and `historical` states. It must record the remaining
hosted/session/browser, Realtime, backup/PITR/restore, preview-auth, provider,
storage, billing, and production gates. It must also record that production
dependencies audit clean while the latest Next ESLint plugin graph retains an
upstream development-only `minimatch`/`brace-expansion` advisory that cannot be
removed without unsupported peer overrides or weakened lint rules. Record
current safe defaults as deferred, not approved expansions: draft/internal
provider records only, link-only media, sponsor proof-only billing, PWA-first,
and Preview OpenAI out of scope. Do not invent proof, expose project secrets, or
mark external gates complete.

### Acceptance Criteria

- `Features`, the capability matrix, production board, audit actions, legacy
  backlogs, and tech-stack wording agree on what is shipped locally, proven
  locally, externally blocked, provider-gated, decision-gated, and historical.
- LP-001 and the completed local portions of LP-007, LP-008, the RLS
  actor/action review, offline/reconnect proof, QA target guards, guarded live
  proof harnesses, and production dependency audit are linked to exact
  committed tests or artifacts without claiming hosted execution or deployment.
- Every remaining hosted, production, provider, storage, billing, Realtime,
  backup, and human-decision gate appears once in the closeout ledger with an
  owner/authority and a concrete acceptance requirement.
- No production, provider, secret, or deployment claim exceeds the evidence in
  the repository.
