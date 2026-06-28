# Codex Rules

These rules are strict boundaries for code changes in Little League HQ.

## Strict Rules

1. Never modify `/lib/domain` without explicit instruction.
2. Never change enum values.
3. Never bypass state machine rules.
4. Never call Supabase directly from UI.
5. Never introduce new workflow states.
6. All provider access must go through `/lib/services`.

## Violation Examples

- Editing `/lib/domain/contracts.ts`, `/lib/domain/types.ts`, or domain reducers during unrelated UI work.
- Renaming, removing, reordering, or adding enum values to make a screen or test pass.
- Setting a workflow status directly instead of using the existing state machine transition rules.
- Importing a Supabase client into `app/` pages, client components, or UI components.
- Adding a new status such as `in_review`, `submitted`, `processing`, or `complete` without an explicitly approved workflow change.
- Calling weather, map, payment, notification, media, AI, or other provider APIs from UI code instead of routing through `/lib/services`.
