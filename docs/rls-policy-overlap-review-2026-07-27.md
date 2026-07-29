# RLS permissive-policy actor/action review

Date: 2026-07-29 (updated from the 2026-07-27 review)
Scope: committed migrations through `20260729144505_team_chat_retention_scope.sql`
Proof level: deterministic source reconstruction only; no hosted database was queried or changed

## Result

The ordered 49-migration chain reconstructs to 156 final policies and 35
permissive overlap groups: 34 `SELECT` groups and one `UPDATE` group. Every
overlap is declared to PostgreSQL role `public`, so `public` is the effective
static actor. Seven groups are on tables whose final migration state revokes
browser-role privileges and grants service-role access; 28 groups remain on the
RLS-governed Data API surface.

Migration 41 deliberately removes the prior browser-facing
`organization admins manage team build plans` policy and revokes browser-role
table privileges; the private planning surface is service-role-only. That
explains the one-policy decrease without changing the overlap-group totals.

Migration 42 adds the user/admin read policy for SMS suppression evidence.
Migration 43 then revokes browser mutation privileges and removes
`team managers create delivery attempts` and
`users can mark own notifications read`. Provider attempts and notification
acknowledgments remain mediated by service-owned transactions and the
service-only receipt RPC. The two removals and one addition reduce the
migration-41 count from 157 to 156 without changing the overlap-group totals.
Migrations 44 through 49 do not add or remove RLS policies.

This is a review, not a policy-change proposal. It does not establish that a
preview or production catalog matches the migrations, and it does not accept
the current advisor warnings as harmless.

Run:

```bash
node scripts/audit-rls-policy-overlaps.mjs --verify
node scripts/audit-rls-policy-overlaps.mjs --json
node scripts/audit-rls-policy-overlaps.mjs --markdown
```

The JSON output is the stable machine-readable catalog. The Markdown output
prints the exact final `USING` and `WITH CHECK` predicates for every policy in
every group. The table below is the checked-in actor/action decision record.

## How to read the review

- `public` is a PostgreSQL pseudo-role, not an unauthenticated application
  actor. A policy declared to `public` applies to every database role unless a
  more restrictive policy type or RLS bypass changes evaluation.
- Permissive policies for the same actor/action are OR-composed. A write policy
  declared `FOR ALL` contributes to the relevant action, so the single
  `UPDATE` group must be reviewed using both `USING` and `WITH CHECK`.
- Table privileges and RLS are separate gates. “Data API” below means the final
  migration chain grants the action to `anon` and `authenticated`.
  “Service-only” means those browser-role privileges were revoked; the policies
  remain defense in depth for any non-bypass direct role.
- `candidate consolidation` means the two SELECT predicates could be preserved
  as one explicit OR expression, subject to equivalence and role tests.
  `intentional separation` means the actor paths or write checks are clearer as
  separate policies at this review stage. `needs hosted/live-role proof` is
  reserved for a static/live mismatch or unresolved live role membership; no
  group is assigned that disposition from source evidence alone.

## Complete overlap matrix

Predicate shorthand names the authorization condition visible in the exact
verifier output. `manage` policies use their final `USING` predicate for reads;
their `WITH CHECK` remains relevant only to writes.

| Group ID | Scope | Actor/action | Final policy predicates | Disposition |
| --- | --- | --- | --- | --- |
| `public.announcements:select:public` | Data API | `public` / SELECT | manage team; access team | candidate consolidation |
| `public.conflict_reviews:select:public` | Service-only | `public` / SELECT | org admin; org admin | intentional separation |
| `public.drill_video_sources:select:public` | Service-only | `public` / SELECT | org admin or active coach membership; org admin | intentional separation |
| `public.emergency_contacts:select:public` | Data API | `public` / SELECT | guardian or player manager; same predicate | candidate consolidation |
| `public.event_attendance:select:public` | Service-only | `public` / SELECT | team manager or active linked guardian; team manager | intentional separation |
| `public.event_series:select:public` | Data API | `public` / SELECT | team manager; team access | candidate consolidation |
| `public.events:select:public` | Data API | `public` / SELECT | team manager and active season; team access | candidate consolidation |
| `public.family_event_handoffs:select:public` | Service-only | `public` / SELECT | requesting active guardian with matching player/event team; team manager | intentional separation |
| `public.family_obligations:select:public` | Service-only | `public` / SELECT | named guardian or org admin; org admin | intentional separation |
| `public.fee_definitions:select:public` | Service-only | `public` / SELECT | org admin; org admin or accessible org team | intentional separation |
| `public.field_locations:select:public` | Data API | `public` / SELECT | org admin; org admin or accessible org team | candidate consolidation |
| `public.field_reservations:select:public` | Data API | `public` / SELECT | org admin; accessible event team | candidate consolidation |
| `public.guardian_authorizations:select:public` | Data API | `public` / SELECT | guardian or player manager; player manager | candidate consolidation |
| `public.learning_plans:select:public` | Data API | `public` / SELECT | team manager; approved and team access | candidate consolidation |
| `public.media_items:select:public` | Data API | `public` / SELECT | team manager; team access | candidate consolidation |
| `public.notification_preferences:select:public` | Data API | `public` / SELECT | team manager; own user ID | candidate consolidation |
| `public.organization_memberships:select:public` | Data API | `public` / SELECT | own user ID or org admin; org admin | candidate consolidation |
| `public.parent_replay_templates:select:public` | Data API | `public` / SELECT | org admin; active global template or org admin/access-team | candidate consolidation |
| `public.parent_replays:select:public` | Data API | `public` / SELECT | team manager; team access | candidate consolidation |
| `public.player_guardians:select:public` | Data API | `public` / SELECT | player team manager; player team access | candidate consolidation |
| `public.player_health_notes:select:public` | Data API | `public` / SELECT | player manager or guardian-visible guardian; player manager | candidate consolidation |
| `public.player_media_consents:select:public` | Service-only | `public` / SELECT | named guardian, team manager, or org admin; named active guardian | intentional separation |
| `public.players:select:public` | Data API | `public` / SELECT | team manager; team access | candidate consolidation |
| `public.rsvps:select:public` | Data API | `public` / SELECT | named active guardian, linked child/team, active season; event team access | candidate consolidation |
| `public.seasons:select:public` | Data API | `public` / SELECT | active org membership; org admin | candidate consolidation |
| `public.sponsor_assets:select:public` | Data API | `public` / SELECT | sponsor org admin; sponsor org admin or sponsor team access | candidate consolidation |
| `public.sponsor_packages:select:public` | Data API | `public` / SELECT | org admin; org admin or accessible org team | candidate consolidation |
| `public.sponsor_placements:select:public` | Data API | `public` / SELECT | org admin; org admin or placement team access | candidate consolidation |
| `public.sponsors:select:public` | Data API | `public` / SELECT | org admin; org admin or sponsor team access | candidate consolidation |
| `public.team_brand_profiles:select:public` | Data API | `public` / SELECT | team manager; published and team access | candidate consolidation |
| `public.team_chat_channels:select:public` | Data API | `public` / SELECT | team manager; team access | candidate consolidation |
| `public.team_chat_messages:update:public` | Data API | `public` / UPDATE | author + visible row, check author + team access; team manager for old and new row | intentional separation |
| `public.team_logo_assets:select:public` | Data API | `public` / SELECT | org admin; approved + bound team + team access | candidate consolidation |
| `public.team_memberships:select:public` | Data API | `public` / SELECT | team manager; own user ID or team manager | candidate consolidation |
| `public.weather_alerts:select:public` | Data API | `public` / SELECT | team manager; team access | candidate consolidation |

The exact policy-name pair, normalized predicate text, source migration, and
source line for each row are emitted by the verifier. This avoids manually
copying a second predicate catalog that could drift from the migration parser.

## Disposition rationale

The seven service-only SELECT groups are intentionally separated for now:
`conflict_reviews`, `drill_video_sources`, `event_attendance`,
`family_event_handoffs`, `family_obligations`, `fee_definitions`, and
`player_media_consents`. Migration
`20260726134836_data_api_service_role_grants.sql` revokes all table privileges
from `public`, `anon`, and `authenticated` for those tables, then grants
service-role DML. Their policies do not create a browser Data API grant.

The 27 exposed SELECT groups are candidate consolidations because each pair is
permissive for the same declared actor and action. The safe candidate shape is
one SELECT policy whose `USING` expression is the exact OR of the current
predicates. That is not authorization to make the change: tests must prove
parent, coach, admin, wrong-role, and cross-tenant equivalence first.

The exposed `team_chat_messages` UPDATE group is intentionally separated.
Author editing is constrained by author identity, visible moderation state, and
team access; staff moderation is constrained by team-management authority.
Combining those paths would make both old-row selection (`USING`) and new-row
admission (`WITH CHECK`) easier to broaden accidentally. UPDATE also requires
an applicable SELECT policy, so a warning count alone is not a sufficient
reason to rewrite it.

## Why 35 static groups can become 175 warnings

The current Supabase `multiple_permissive_policies` linter joins a policy
declared to `public` (`polroles = array[0::oid]`) to every catalog role that is
not excluded by its internal-role filters and does not bypass RLS. It then
groups by schema, table, expanded role, and action. Therefore one semantic
`public` actor/action group can produce one warning per eligible live role.

`175 = 35 × 5` is consequently a role-expansion hypothesis: it is consistent
with five eligible roles on the observed targets, but this source review does
not prove which five roles existed when the advisor ran. Compare an authorized
live export from `supabase/rls-policy-overlap-review.sql` before treating the
factor as accepted live-catalog evidence. The query mirrors the role expansion,
marks bypass roles, reports action-specific table privileges, and returns only
catalog expressions—never application rows or secrets.

References:

- [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase advisor catalog](https://supabase.com/docs/guides/database/database-advisors?lint=0006_multiple_permissive_policies)
- [Supabase Splinter implementation](https://github.com/supabase/splinter/blob/main/splinter.sql)
- [Data API grant-model change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

## SaaS boundary record

- Tenant context and isolation: predicates remain organization/team/player/
  guardian scoped; this task changes no runtime policy.
- Actor authorization: the review distinguishes database actor expansion from
  application roles and preserves the source predicates verbatim in verifier
  output.
- Lifecycle/configuration: no workflow state or feature gate changes.
- Audit/observability: deterministic JSON/Markdown output plus a read-only live
  comparison query.
- Failure/idempotency: the verifier fails on unknown policy-changing DDL,
  missing ALTER/DROP targets, duplicate creates, count drift, or missing review
  coverage; repeated runs are read-only and stable.
- Security check: no row data, secrets, grants, migrations, policies, hosted
  projects, or providers are read or mutated.
