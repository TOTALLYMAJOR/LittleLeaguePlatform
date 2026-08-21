# supabase/ — schema and RLS contract

Highest blast radius in the repo. Everything here is tenant-isolation enforcement.

## Migrations are append-only

- **Never edit or renumber an applied migration.** Fix forward with a new file.
- **New migrations use the Supabase CLI timestamp format**: `YYYYMMDDHHMMSS_description.sql`.
  The `0001_`–`0033_` sequential series is historical — do not extend it.
- Open with a comment stating what the migration establishes and which boundary it protects.
- Prefer idempotent DDL (`add column if not exists`, `create or replace function`).

## Row-level security

- **Every new table gets `alter table public.<name> enable row level security;`** plus explicit
  policies in the same migration. A table without RLS is a tenant leak, not a TODO.
- Policies are named in prose (`create policy "parents can upsert linked child rsvps"`).
  `supabase/rls-policy.test.ts` asserts these **literal strings** against the migration files —
  renaming or removing a policy breaks that test. Update it in the same change, never by
  loosening the assertion.
- Scope predicates on the real relationship chain, not on a single id. Existing pattern:
  active guardian status **and** player-to-team match **and** active team season.

## security definer helpers

25 of 50 migrations define `security definer` functions. When adding one:

- Always `set search_path = public`.
- Revoke PostgreSQL's default grant, then grant explicitly:
  ```sql
  revoke execute on function public.my_helper(uuid) from public, anon;
  grant  execute on function public.my_helper(uuid) to authenticated, service_role;
  ```
  Leaving the PUBLIC grant exposes the function to anonymous callers as a Data API RPC.
- See `20260726143938_restrict_rls_helper_execution.sql` for the canonical shape.

## Applying migrations

Never run `supabase db push` or raw psql against a hosted project.

```bash
npm run supabase:plan     # dry run — always first
npm run supabase:push     # guarded runner
```

`scripts/supabase-push.mjs` gates on `SUPABASE_MIGRATION_TARGET_REF`,
`SUPABASE_MIGRATION_TARGET_ENV`, and `SUPABASE_MIGRATION_CONFIRM`, and validates the pooler host.
Do not set `SUPABASE_MIGRATION_ALLOW_APP_TARGET` or `SUPABASE_MIGRATION_INCLUDE_SEED` to get past
a guard — the guard is the control. **Targeting the production ref requires explicit human
approval in the current task.** `supabase/supabase-push-guard.test.ts` covers these paths.

## Proof

```bash
npm test                  # includes supabase/*.test.ts
npm run qa:rls-proof      # scripts/verify-rls-boundaries.mjs
```

A schema change is not done until RLS proof passes and the boundary is reflected in
`docs/Features.md` / `docs/capability-matrix.md`.

## Documentation gate

Storage-location or data-flow changes and contract changes used in 3+ places require an ADR
before implementation — see the root `CLAUDE.md`. Most non-trivial migrations here meet that bar.
