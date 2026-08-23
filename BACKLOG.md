---
authority: contested
answers: execution-queue
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
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

## LP-OFFLINE-001 - Close private, actor-bound offline and reconnect proof

```yaml
estimate_hours: 14
epic_id: LOCAL-CLOSEOUT
epic_title: Safe local backlog closeout
epic_outcome: Remaining approved local implementation and proof gaps are closed without crossing hosted or provider authority.
depends_on: []
owns:
  - lib/offline/game-day-outbox.ts
  - lib/offline/game-day-outbox.test.ts
  - components/offline-sync-status.tsx
  - components/offline-sync-status.test.tsx
  - components/ui/AppShell.tsx
  - components/ui/AppShell.test.tsx
  - components/feature-panels.tsx
  - app/providers.tsx
  - app/offline/page.tsx
  - public/offline.html
  - public/sw.js
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npx vitest run lib/offline/game-day-outbox.test.ts components/offline-sync-status.test.tsx components/ui/AppShell.test.tsx app/routes-smoke.test.ts
  - npm run typecheck
  - git diff --check
risk_score: 9
```

Refactor the private game-day outbox around an injectable storage boundary so
the real IndexedDB adapter and an in-memory proof adapter exercise the same
reconciliation and atomic-claim logic. Every queued action must be bound to the
authenticated actor as well as organization, season, team or family context.
Derive the only allowed endpoint from each of the three approved low-authority
action types; never persist or trust a caller-provided endpoint.

Use an atomic IndexedDB claim/lease or equivalent browser-wide lock so separate
tabs, windows, and engine instances cannot send one action twice. Preserve
causal queue order: a transient, authentication, authorization, validation, or
conflict failure stops later actions in that context. Classify network, 429/5xx,
400/404, 401/403, and 409/stale-version outcomes truthfully instead of labeling
all failures as network retries. Add bounded retention, queue limits, and
payload-free sync receipts so a real successful replay can be reported without
retaining the private mutation payload.

Wire an actual signed-in shell sign-out action. It must await an owner-scoped
generation-fenced clear before Supabase sign-out and navigation so an in-flight
request cannot resurrect private data. Actor changes and expired sessions must
stop replay and hide or clear another actor's queue. Context clearing must be a
single atomic operation and must not delete another actor or context.

Expose an accessible offline status summary with truthful queued, retrying,
conflict, sign-in-required, review-required, and synced states. It must never
display payload contents or private child details.

Replace the service worker's cached dynamic `/offline` response with a
non-personalized static fallback. Do not cache server-rendered shell HTML that
contains role, organization, season, or session context. The cold offline
fallback must work before `/offline` has ever been opened online, use a new
cache version, and may show only payload-free queue/receipt counts. This task
uses fakes and local static checks only; it does not make hosted, provider, or
production calls.

### Acceptance Criteria

- Memory and real IndexedDB adapters implement the same atomic claim, lease,
  receipt, generation, and clear contract; tests use two engines sharing one
  store to prove cross-tab duplicate suppression.
- Actor ID is part of every queue and receipt key. Actor mismatch, session
  expiry, arbitrary endpoint injection, and type-to-endpoint mismatch fail
  before fetch. Nested payloads are structurally cloned in both adapters.
- A transient failure preserves causal order and remains bounded/retryable;
  400/404, 401/403, 409, 429, 5xx, and network outcomes have distinct terminal
  or review states. No private payload has unbounded retention.
- Owner/context clearing is atomic. Sign-out awaits a generation-fenced clear,
  and an in-flight failure or completion cannot recreate cleared data.
- A persisted payload-free receipt makes the synced state truthful. The online
  route and cold static fallback communicate accessible status without
  exposing payloads, child details, personalized shell HTML, or false delivery.
- The service worker uses a new cache and a static non-personalized fallback;
  tests prove it never caches dynamic `/offline` HTML or private route HTML.

## LP-QA-GUARD-001 - Guard every mutating QA script from production

```yaml
estimate_hours: 6
epic_id: LOCAL-CLOSEOUT
epic_title: Safe local backlog closeout
epic_outcome: Remaining approved local implementation and proof gaps are closed without crossing hosted or provider authority.
depends_on: []
owns:
  - scripts/qa-target-guard.mjs
  - scripts/verify-qa-session-paths.mjs
  - scripts/capture-communication-room-record-proof.mjs
  - scripts/bootstrap-demo-tenant.mjs
  - app/api/qa-target-identity/route.ts
  - app/api/qa-target-identity/route.test.ts
  - supabase/qa-target-guard.test.ts
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npx vitest run supabase/qa-target-guard.test.ts app/api/qa-target-identity/route.test.ts
  - node --check scripts/bootstrap-demo-tenant.mjs
  - node --check scripts/capture-communication-room-record-proof.mjs
  - node --check scripts/verify-qa-session-paths.mjs
  - npm run typecheck
  - git diff --check
risk_score: 10
```

Close the local production-safety gap in three existing scripts that can perform
service-role or browser/API mutations. Extend the established isolated-target
contract so both the Supabase project and the application base URL are bound
before any client, auth session, browser, output directory, service-role call,
or application mutation is created.

Add a read-only application target-identity route that defaults disabled and
exposes only the deployment class and public Supabase project ref derived from
server configuration. Mutating browser scripts must preflight that route and
prove it matches the explicitly selected isolated QA project. Reject the
canonical production host and protected production project unconditionally. A
non-loopback app URL also requires HTTPS, an exact invocation-only URL match,
and a distinct mutation confirmation. Missing, unreachable, timed-out,
malformed, non-2xx, cross-origin redirected, mismatched, disabled, or production
identity must fail closed before sign-in, seeding, output creation, or mutation.

Reject arbitrary opaque credential strings. Before any mutation, perform a
read-only service-role preflight against the guarded Supabase URL and prove the
credential is accepted by that exact project without printing it. Preserve each
script's existing confirmation and cleanup semantics as defense in depth.

### Acceptance Criteria

- QA session proof and Communication Room proof bind their application URL and
  target-identity response to the same explicitly selected isolated QA project
  before browser creation, sign-in, fetch, screenshot setup, seeding, or
  application mutation. This identity check is required for loopback too.
- All three scripts reject the protected production project. Browser scripts
  also reject `leaguepilot.us`, `www.leaguepilot.us`, an unconfirmed hosted app,
  target-ref mismatch, cross-origin redirect, malformed identity, and a
  production or unreachable identity route before mutable work.
- Service-role scripts reject browser keys and arbitrary opaque values, then
  prove credential/project binding through a read-only preflight before
  mutation. Secret values are never logged or returned.
- Tests prove every rejected target leaves client, browser, auth, filesystem,
  insert, and upsert spies untouched. Static ordering coverage fails if any
  target, credential, app URL, identity, or preflight check moves behind those
  side effects.
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
  - LP-OFFLINE-001
  - LP-QA-GUARD-001
  - LP-RLS-PROOF-002
  - LP-LIFECYCLE-PROOF-001
owns:
  - README.md
  - docs/Features.md
  - docs/capability-matrix.md
  - docs/feature-fit-backlog.md
  - docs/production-audit-action-items.md
  - docs/production-task-board.md
  - docs/tech-stack.md
  - docs/backlog-now.md
  - docs/backlog-next.md
  - docs/runbook.md
  - docs/build-progress.md
  - docs/enterprise/deployment-operations.md
  - docs/enterprise/test-release-plan.md
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

Remove or clearly retire every current instruction that runs a mutating
`qa:session-proof` or Communication Room proof against the production alias.
Production acceptance must use a separately named read-only harness; the
mutating scripts are isolated-QA-only after LP-QA-GUARD-001.

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
