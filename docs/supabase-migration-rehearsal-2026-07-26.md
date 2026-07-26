# Supabase Migration Gap Report

Date: 2026-07-26

Scope: close the LeaguePilot `0021` → current migration uncertainty on an isolated target without mutating production or treating database proof as provider/production acceptance.

## Outcome

The migration gap is closed on local PostgreSQL 17 and on an isolated Supabase preview. Production remains unchanged.

- Production `main` (`dkwghvvlbdnnwzbnscvu`) still ends at migration `0021`.
- After the Supabase plan upgrade, preview branch `leaguepilot-migration-gap-qa-20260726` (`gmrvnnkxksqkcxcmydhr`) was created without production data.
- A guarded dry run listed exactly `0022`-`0033`, security-definer hardening, Data API grant compatibility, and extension relocation.
- The complete chain applied through `20260726144407`; migration-history readback aligns and the next dry run reports the database up to date.
- `btree_gist` now lives in the `extensions` schema, its field-reservation exclusion constraint remains valid, and local and hosted error-level database lint reports no findings.
- Hosted parent, coach, and anonymous real-session RLS proof passes.
- Hosted provider-free transportation and caregiver lifecycle proof passes with audit and database readback.

## Defects Closed

1. PostgreSQL 17 rejected `authorization` as an alias in migrations `0028` and `0029`. Both aliases now use specific non-reserved names.
2. Current opt-in Data API defaults left SQL-created tables inaccessible on a clean project. The new compatibility migration:
   - grants DML to `anon`, `authenticated`, and `service_role` on the 58 legacy RLS-governed tables;
   - revokes `public`, `anon`, and `authenticated` from the 20 `0022`-`0024` server-adapter tables;
   - grants only `select`, `insert`, `update`, and `delete` on those 20 tables to `service_role`.
3. The original transportation index allowed only one awaiting offer even though acceptance logic withdraws competing offers. The index now permits multiple pending offers and enforces one final assigned row.
4. Migration promotion previously used seed by default and did not bind the target. The runner now allowlists Supabase direct/session-pooler hosts, binds ref to environment classification, keeps intent/confirmation values invocation-only, plans with the exact apply arguments, requires a distinct production confirmation, and keeps seed opt-in with production seed forbidden.
5. Transaction-pooler port `6543` caused a prepared-statement error before apply. The runner now rejects that mode; preview promotion used the Supavisor session pooler on port `5432`.
6. QA fixture mutation now rejects the protected production ref, requires an exact hosted target/parent/confirmation tuple, uses a stable anchor date, and refuses to rewrite an existing versioned schedule.
7. The database advisor flagged `btree_gist` in `public`. The extension now lives in `extensions`, with dependent operators and the field-reservation exclusion constraint preserved.
8. Error-level PL/pgSQL lint found `revocation_reason` ambiguous inside additional-guardian revocation. An additive replacement preserves the named RPC contract and uses the positional argument for the table update.
9. PostgreSQL's default `PUBLIC` execution grant exposed eight security-definer RLS helpers more broadly than required. The candidate now revokes `PUBLIC` and grants only the API roles that need policy evaluation plus `service_role`. A real anonymous query caught and corrected the initial over-restriction before publication.

## Verified Evidence

### Migration and schema

- Clean local reset: `0001` through `0033` plus six timestamped migrations ending at `20260726144407`.
- Hosted preview history: the same complete sequence.
- Hosted follow-up plan: no pending migration.
- Local and hosted error-level database lint: no findings.
- `btree_gist` schema: `extensions`; field-reservation exclusion constraint validated.
- Hosted Security Advisor after final apply: 14 informational `rls_enabled_no_policy` entries for intentionally service-only tables, 16 RLS-helper execution warnings for the `anon`/`authenticated` roles needed by policy evaluation, and one leaked-password-protection warning.
- Public tables with RLS disabled: `0`.
- Legacy grant set: `58` tables, intended DML present for all three Data API roles.
- Server-only grant set: `20` tables, browser-role DML absent and service-role DML present.
- Transportation uniqueness: one partial unique index on `request_id where status = 'assigned'`.

### Real-session and lifecycle

- QA parent can read a linked child but not another team.
- QA coach can update assigned-team weather but not archived-season events.
- Anonymous users cannot read private teams.
- Transportation: request → driver offer → requesting-guardian acceptance → assigned.
- Temporary caregiver: create → wrong-email rejection → exact-email acceptance → revoke.
- Selected-event schedule version, six attributed audits, invite-proof rotation, no caregiver team membership, and zero notification delta were read back.
- `PROVIDER_SENDS_ENABLED=false`; the lifecycle harness attempted no provider calls.

## Evidence Still Open

- Production backup, PITR, and restore-procedure review.
- Explicit production migration approval and production apply/readback.
- Full populated proof for every `0022`-`0033` feature, including cross-organization, cross-team, cross-family, wrong-role, concurrency, expiry, cache clearing, official correction/projection, media revocation, season transition, and downstream refusal.
- Hosted application/browser proof against the preview API.
- Provider sandbox, webhook, consent, sender-registration, media-scan, payment-settlement, and production-operational proof.
- Hosted Auth settings such as leaked-password protection.
- Security Advisor review and explicit acceptance or redesign of the RLS-helper execution pattern and intentionally policy-less service tables.

## Ordered Candidate

For production, which is still aligned through `0021`, the reviewed order is:

1. `0022_drill_video_references.sql`
2. `0023_operational_truth_hardening.sql`
3. `0024_coordination_loops.sql`
4. `0025_family_first_sign_in.sql`
5. `0026_parent_invite_acceptance.sql`
6. `0027_additional_guardian_requests.sql`
7. `0028_transportation_responsibility.sql`
8. `0029_temporary_caregiver_authorizations.sql`
9. `0030_official_communication_revisions.sql`
10. `0031_parent_replay_family_story.sql`
11. `0032_season_transition_reviews.sql`
12. `0033_registration_invitation_issuance.sql`
13. `20260724143554_security_definer_execution_hardening.sql`
14. `20260726134836_data_api_service_role_grants.sql`
15. `20260726142404_relocate_btree_gist_extension.sql`
16. `20260726143452_fix_additional_guardian_revocation_ambiguity.sql`
17. `20260726143938_restrict_rls_helper_execution.sql`
18. `20260726144407_restore_anon_rls_policy_evaluation.sql`

Do not repair history merely to force alignment. Stop if the target does not match the expected `0021` lineage.

## Production Gate

1. Retain the preview evidence and complete the missing cross-boundary/browser journeys.
2. Review production backup, PITR, restore timing, and lock/traffic posture.
3. Run `npm run supabase:plan` against the allowlisted, explicitly bound production session/direct URL with the protected ref classified as `production`.
4. Obtain explicit production approval after reviewing the exact plan.
5. Apply without seed data using the invocation-only `SUPABASE_MIGRATION_CONFIRM=apply-reviewed-production-migrations` confirmation.
6. Read back history, grants, RLS, advisors, and application health.
7. Keep provider, media, and payment activation as separate approvals.

The preview proves migration compatibility and the focused RLS/lifecycle slice. It is not production or provider acceptance.
