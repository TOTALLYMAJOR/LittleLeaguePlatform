# Codex Rules

These rules are strict boundaries for code changes in Little League HQ.

## Repository Scope Guard

Before starting any repository task, state the repo/product name and absolute working directory in the first task update. When shell access is available, verify the physical working directory and Git root with `pwd -P` and `git rev-parse --show-toplevel` before making changes. Open IDE tabs are context only; they do not authorize access to sibling repositories. If the IDE path, shell directory, and Git root conflict, pause repo-specific edits until the intended target is clear.

Use the `bounded-repo-work` skill to enforce these boundaries:

- Treat the physical Git root as the default boundary for discovery, reads, writes, validation, and process inspection.
- Before editing, lock a task manifest containing the smallest necessary read roots, explicitly owned write paths, and focused validation commands. Write only to declared owned paths.
- Run at most one bounded inventory for a source fingerprint. Reuse that result and use targeted searches afterward; do not repeat broad repository scans without a changed fingerprint or explicit approval.
- Treat home directories, drive roots, sibling repositories, provider-wide inventories, and unrelated processes as outside scope unless the user explicitly requests the exact additional target.
- Do not infer permission for repo-external task data, plugin or connector invocation, web or official-documentation fallbacks, or machine-wide Git, WSL, and Windows inspection from task relevance, a recommendation, or a blocked tool call. These actions require explicit user instruction naming the external target or purpose.
- If the guard blocks an external reference that is not part of the normal-operation allowlist below, stop that external path and ask the user for the smallest authorization needed. Do not route around the denial with web search, another plugin, a provider query, or broader local inspection.
- Treat a request to inspect another repository, directory, drive, or provider as a separate bounded task. Read access does not imply permission to write, delete, deploy, or mutate provider state.
- Reuse an approved provider inventory while its source state is unchanged. Provider-wide list, search, export, deploy, and mutation operations require explicit scope.
- Never stop WSL, VS Code, AgentFlow, Docker, or a process selected only by name. Process termination requires an exact PID, verified executable and working directory, an impact review, and explicit approval for the exact command.
- If the guard blocks progress, report the exact rejected target and request the smallest expansion. Never disable or bypass the guard, broaden the manifest to conceal an unrelated target, or silently widen scope.

### Allowed Normal Operations

The following operations do not expand task scope when they are read-only or confined to declared repository paths:

- Read an applicable installed skill's `SKILL.md` and only the directly referenced instructions, templates, scripts, or assets under that skill's configured root. This control-plane allowance does not authorize installing a skill, invoking a plugin or connector, browsing the web, calling a provider, or reading unrelated files beside the skill.
- Read the active task-scope manifest and use the scope guard's `status` and `scope` commands. The guard may update its own active manifest and audit record as part of enforcement.
- Run repository-anchored Git commands such as `rev-parse`, `status`, `diff`, `log`, and `show`. Git may follow its own linked-worktree metadata, but raw traversal of the containing worktree store or sibling checkout is not allowed.
- Invoke already-installed shells, Git, language runtimes, compilers, linters, test runners, and other declared validation tools through `PATH`, including their implicit runtime libraries and caches.
- Restore lockfile-declared dependencies with the repository's existing package manager when implementation or validation requires them. Do not upgrade dependencies, change the lockfile, install global tools, or add plugins unless those changes are explicitly in scope.
- Create task-specific temporary files under the system temporary directory and remove only those exact files. Repository-generated output must stay in an owned path or be an expected ignored artifact of a declared validation command.
- Connect to a task-specific localhost development or test service for declared validation. This does not authorize broad process discovery, process termination, LAN scanning, hosted-environment access, or provider calls.
- Inspect versions and resolve executable locations for the declared toolchain. Do not dump the environment, credentials, shell history, global configuration, or machine-wide package inventory.

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
- Falling back to web or official documentation after the scope guard denies access to an external skill that the user did not request.
- Inspecting machine-wide Git, WSL, Windows, drive, or sibling-repository state because it appears relevant without explicit user instruction.
