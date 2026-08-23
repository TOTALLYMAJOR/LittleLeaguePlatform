---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# Supabase Migration Gap Report

Date: 2026-07-26

Scope: close the LeaguePilot `0021` → current migration uncertainty on an isolated target, record the separately approved production installation/readback, and promote the preview-proven RLS initplan optimization after a second explicit production approval without treating database proof as browser, provider, recovery, Realtime, or operational acceptance.

## Outcome

The original migration gap and the follow-on RLS performance migration are closed on local PostgreSQL 17, isolated Supabase preview, and the active production database.

- Production `main` (`dkwghvvlbdnnwzbnscvu`) is aligned at 40 migrations through `20260726182645_optimize_rls_auth_initplans.sql`.
- After the Supabase plan upgrade, preview branch `leaguepilot-migration-gap-qa-20260726` (`gmrvnnkxksqkcxcmydhr`) was created without production data.
- Preview and production guarded dry runs listed the same exact 18-migration gap: `0022`-`0033` plus six timestamped security/Data API/extension hardening migrations.
- After explicit production approval and a zero-workload preflight, that complete 18-migration chain applied without seed data and established the verified 39-migration base.
- Preview then applied and read back `20260726182645_optimize_rls_auth_initplans.sql` as migration 40 without seed data. After a separate explicit approval and production preflight, the guarded runner applied the same one-file migration to production without seed data. Both follow-up plans are empty.
- `btree_gist` now lives in `extensions`, its field-reservation exclusion constraint remains valid, and local, preview, and production error-level database lint reports no findings.
- Preview and production Performance Advisor warnings each fell from 224 to 175 by clearing all 49 `auth_rls_initplan` findings; 175 `multiple_permissive_policies` findings remain on each target.
- Preview parent, coach, and anonymous real-session RLS proof passes after migration 40.
- Production read-only parent, coach, admin, and anonymous session checks pass after migration 40 without application mutations or provider calls.
- Preview provider-free transportation and caregiver lifecycle proof passes after migration 40 with audit and database readback. Those populated journeys were not run against production.

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
10. Supabase Performance Advisor identified 49 policies that recalculated 72 row-invariant `auth.uid()` calls per row. The migration wraps those calls in scalar subqueries. Preview and production before/after catalog comparisons preserve policy names, commands, roles, permissiveness, normalized predicates, table grants, and RLS settings.

## Production Promotion

- Target: LeaguePilot production `dkwghvvlbdnnwzbnscvu`, PostgreSQL `17.6.1.127`, `us-east-1`.
- Original-gap preflight: 21 migrations ending at `0021`; zero competing active sessions, open transactions, lock waiters, or long-running transactions; database size 17,411,219 bytes.
- Follow-on preflight: 39 migrations ending at `20260726144407`; zero competing active sessions, open transactions, lock waiters, long-running transactions, or ungranted locks; database size 20,163,731 bytes.
- Recovery posture: WAL-G daily backups enabled, PITR disabled, eight completed physical snapshots observed, and the latest platform snapshot was `2026-07-26T09:34:41.666Z`. No provider restore drill is proven.
- Additional safety evidence: restricted schema-only and data-only logical snapshots were created outside the repository before apply. The data-only dump reported circular team-chat foreign keys and is not a proven standalone restore; it supplements rather than replaces the platform backup.
- Original-gap apply: the guarded runner independently verified the production ref/classification, rejected seed inclusion, repeated the reviewed dry run, and applied the 18 migrations over the Supavisor session pooler on port `5432`.
- Follow-on apply: the guarded runner repeated the target checks and one-file dry run, required `SUPABASE_MIGRATION_CONFIRM=apply-reviewed-production-migrations`, rejected seed inclusion, and applied only `20260726182645_optimize_rls_auth_initplans.sql`.
- Readback: production advanced from 39 migrations through `20260726144407` to 40 through `20260726182645`; the guarded follow-up plan is empty. Performance Advisor warnings moved from 224 to 175, with `auth_rls_initplan` findings moving from 49 to zero and 175 `multiple_permissive_policies` findings unchanged.
- Semantic readback: normalized policy digest `cb46557778ee9bb9b180ad34da95345981ff0ba8dc69bd4eaaa780064ff986fe`, grant digest `18a0adc45b74279d5e201828025d785b2965ec839997b246da64ebcdc6bea076`, and RLS-state digest `b2ac62d2737f087199562339af08a6524dac1b15674140a7b93f97ac9e40c6ea` are unchanged.
- Workload after each apply: zero other active sessions, open transactions, lock waiters, long-running transactions, or ungranted locks.
- Provider and data boundary: sampled application row counts are unchanged, all 34 new workflow tables remain empty, both organizations retain `provider_sends_enabled=false`, and no provider call or fixture seed ran.

## Verified Evidence

### Migration and schema

- Clean local reset: all 40 migrations through `20260726182645_optimize_rls_auth_initplans.sql`.
- Preview and production history: 40 migrations through `20260726182645`.
- Preview and production guarded follow-up plans: no pending migration.
- Local, preview, and production error-level database lint: no findings.
- `btree_gist` schema: `extensions`; field-reservation exclusion constraint validated.
- Production error-level Security and Performance Advisors: no findings. Production Security Advisor warnings improved from three to zero.
- Preview and production Performance Advisor warnings: 175 total on each target, comprising zero `auth_rls_initplan` and 175 `multiple_permissive_policies`.
- Preview and production normalized policy digest: `cb46557778ee9bb9b180ad34da95345981ff0ba8dc69bd4eaaa780064ff986fe`; grant digest: `18a0adc45b74279d5e201828025d785b2965ec839997b246da64ebcdc6bea076`; RLS-state digest: `b2ac62d2737f087199562339af08a6524dac1b15674140a7b93f97ac9e40c6ea`.
- Production public tables: 92 total; RLS disabled: `0`.
- Production legacy grant set: `58` tables, intended DML present for `anon`, `authenticated`, and `service_role`.
- Production `0022`-`0024` server-only grant set: `20` tables, browser-role DML absent and service-role DML present.
- Production later policy-less server-only set: `14` tables, browser-role DML absent and service-role DML present.
- Transportation uniqueness: one partial unique index on `request_id where status = 'assigned'`.
- Production backfill: all five existing RSVPs have a non-null current schedule version, updater, and valid lock version; no duplicate client action IDs.
- Production row integrity: preflight-sampled counts for organizations, profiles, players, guardians, RSVPs, field reservations, registration approval actions, notifications, and delivery attempts are unchanged. All 34 new workflow tables remain empty. The intentional `NOT VALID` registration evidence-note constraint has zero existing-row violations.

### Production service smoke

- Supabase project, Auth, REST, Storage, Database, and Realtime control-plane services report `ACTIVE_HEALTHY`.
- `https://www.leaguepilot.us/` and `/auth` return HTTP 200.
- Supabase Auth health and Storage status return HTTP 200.
- Anonymous PostgREST reads against `organizations` and `profiles` return HTTP 200 and zero rows through RLS.
- Read-only signed-in checks confirm a parent can read one linked child but not a cross-team child and has no organization-membership row; a coach can read assigned team scope, one weather row, and their own profile; an administrator can read their organization and membership; anonymous team reads return zero rows.
- The signed-in production check performed zero application mutations and zero provider calls. It is session/RLS evidence, not browser or populated lifecycle proof.
- Realtime operational data remains disconnected: `db_connected=false`, `replication_connected=false`, `connected_cluster=0`, and no Realtime replication slot exists. Control-plane health is not subscription/change-delivery proof.

### Preview real-session and lifecycle

- QA parent can read a linked child but not another team.
- QA coach can update assigned-team weather but not archived-season events.
- Anonymous users cannot read private teams.
- Transportation: request → driver offer → requesting-guardian acceptance → assigned.
- Temporary caregiver: create → wrong-email rejection → exact-email acceptance → revoke.
- Selected-event schedule version, six attributed audits, invite-proof rotation, no caregiver team membership, and zero notification delta were read back.
- `PROVIDER_SENDS_ENABLED=false`; the lifecycle harness attempted no provider calls.

## Evidence Still Open

- Enable or explicitly accept the absence of PITR, establish a fresh durable recovery point, and prove the restore procedure. The observed daily backup predates promotion, and the logical snapshots were not restore-tested.
- Full populated proof for every `0022`-`0033` feature, including cross-organization, cross-team, cross-family, wrong-role, concurrency, expiry, cache clearing, official correction/projection, media revocation, season transition, and downstream refusal.
- Signed-in browser proof against the migrated preview and production APIs, plus broader production role, cross-tenant, and populated lifecycle proof beyond the narrow read-only session check.
- Production Realtime subscription authorization, reconnect, and change-delivery proof.
- Review the 175 overlapping permissive-policy findings with an actor/action matrix. Mechanical consolidation is deferred because permissive policies compose with `OR` and write `USING`/`WITH CHECK` semantics must remain independent.
- Provider sandbox, webhook, consent, sender-registration, media-scan, payment-settlement, and production-operational proof.
- Broader production application health and role-scoped lifecycle proof beyond the public/Auth/Storage/Data API smoke checks.

## Installed Order

Production applied and read back the reviewed order below:

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
19. `20260726182645_optimize_rls_auth_initplans.sql`

Do not repair history merely to force alignment. Production remains on the verified ordered lineage through `20260726182645`, which was promoted only after separate preview proof and explicit production approval.

## Post-Migration Production Gates

1. Preserve production migration-history/readback evidence through `20260726182645`.
2. Close or explicitly accept production backup/PITR/restore timing and prove the restore procedure.
3. Run production signed-in browser proof, including cross-tenant and broader feature lifecycles beyond the narrow read-only session check.
4. Prove production Realtime subscription authorization, reconnect, and change delivery.
5. Review and disposition the remaining 175 overlapping permissive-policy findings.
6. Keep provider, media, and payment activation as separate approvals.

Production migration installation/readback plus narrow read-only signed-in RLS checks prove schema promotion and limited session boundaries only. They are not signed-in browser, populated lifecycle, provider, backup/PITR/restore, Realtime, or operational acceptance.
