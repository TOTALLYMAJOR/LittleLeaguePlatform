# Codex Rules

These rules are strict boundaries for code changes in Little League HQ.

## Task Start Governance

Before starting any task, state the repository context in the first task update: repo/product name and absolute working directory. When shell access is available, verify it with `pwd` and `git rev-parse --show-toplevel` before making changes. If the IDE path, shell cwd, and Git root do not match, pause repo-specific edits until the intended target repo is clear.

## Strict Rules

1. Never modify `/lib/domain` without explicit instruction.
2. Never change enum values.
3. Never bypass state machine rules.
4. Never call Supabase directly from UI.
5. Never introduce new workflow states.
6. All provider access must go through `/lib/services`.

## Every-Task SaaS Constants

For any non-trivial product, API, data, provider, admin, proof, or launch task, identify the applicable row in `docs/production-task-board.md` and answer the concrete task template before claiming the work is complete.

Minimum fields for every task:

- Tenant context: organization, season, team, player, guardian, or user scope.
- Tenant isolation: server check, Supabase adapter, RLS policy, route test, QA proof, browser proof, or documented no-runtime-change boundary.
- Actor authorization: verified session actor, role, target object, and action-specific permission.
- Lifecycle/state: existing state values and legal transition owner. Do not add states without explicit approval.
- Configuration: global, environment, organization, team, user, or provider-gated behavior.
- Audit/observability: audit event, delivery attempt, metric, screenshot, log, or dashboard evidence.
- Failure/idempotency: partial-failure behavior, retry safety, duplicate prevention, and concurrency protection.
- Security threat check: IDOR, tenant spoofing, mass assignment, privilege escalation, export leakage, webhook replay, provider-send abuse, or billing abuse.

If a task touches billing, providers, storage/files, search/cache/analytics, admin/support operations, migrations, or releases, apply the extra checks in `docs/production-task-board.md`.

## Violation Examples

- Editing `/lib/domain/contracts.ts`, `/lib/domain/types.ts`, or domain reducers during unrelated UI work.
- Renaming, removing, reordering, or adding enum values to make a screen or test pass.
- Setting a workflow status directly instead of using the existing state machine transition rules.
- Importing a Supabase client into `app/` pages, client components, or UI components.
- Adding a new status such as `in_review`, `submitted`, `processing`, or `complete` without an explicitly approved workflow change.
- Calling weather, map, payment, notification, media, AI, or other provider APIs from UI code instead of routing through `/lib/services`.
