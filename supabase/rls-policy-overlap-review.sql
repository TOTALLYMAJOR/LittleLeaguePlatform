-- Read-only catalog comparison for the LeaguePilot permissive-policy review.
--
-- This query reads PostgreSQL catalogs only. It returns policy definitions,
-- role expansion, table privileges, and overlap counts; it does not read
-- application tables, row data, settings, Vault, or secrets.
--
-- Run only against an explicitly authorized target. Save the result as JSON or
-- CSV and compare schema_name/table_name/action/effective_actor/policy_name/
-- using_expression/with_check_expression with the static verifier output.

with policy_catalog as (
  select
    namespace.nspname as schema_name,
    relation.relname as table_name,
    relation.oid as table_oid,
    policy.polname as policy_name,
    policy.polpermissive as is_permissive,
    policy.polroles as policy_role_oids,
    case policy.polcmd
      when 'r' then array['SELECT']
      when 'a' then array['INSERT']
      when 'w' then array['UPDATE']
      when 'd' then array['DELETE']
      when '*' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
      else array['UNKNOWN']
    end as actions,
    pg_get_expr(policy.polqual, policy.polrelid) as using_expression,
    pg_get_expr(policy.polwithcheck, policy.polrelid) as with_check_expression
  from pg_catalog.pg_policy as policy
  join pg_catalog.pg_class as relation
    on relation.oid = policy.polrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where relation.relkind = 'r'
    and namespace.nspname in ('public', 'storage')
),
expanded as (
  select
    catalog.schema_name,
    catalog.table_name,
    catalog.table_oid,
    action.value as action,
    role.rolname as effective_actor,
    role.rolbypassrls as actor_bypasses_rls,
    catalog.policy_name,
    catalog.is_permissive,
    case
      when catalog.policy_role_oids = array[0::oid] then array['public']
      else array(
        select policy_role.rolname
        from pg_catalog.pg_roles as policy_role
        where policy_role.oid = any(catalog.policy_role_oids)
        order by policy_role.rolname
      )
    end as declared_policy_roles,
    catalog.using_expression,
    catalog.with_check_expression
  from policy_catalog as catalog
  cross join lateral unnest(catalog.actions) as action(value)
  join pg_catalog.pg_roles as role
    on catalog.policy_role_oids = array[0::oid]
    or catalog.policy_role_oids @> array[role.oid]
  where role.rolname not like 'pg\_%' escape '\'
    and role.rolname not like 'supabase%admin'
),
annotated as (
  select
    expanded.*,
    pg_catalog.has_table_privilege(
      expanded.effective_actor,
      expanded.table_oid,
      expanded.action
    ) as actor_has_table_privilege,
    pg_catalog.has_table_privilege('anon', expanded.table_oid, expanded.action)
      as anon_has_table_privilege,
    pg_catalog.has_table_privilege('authenticated', expanded.table_oid, expanded.action)
      as authenticated_has_table_privilege,
    pg_catalog.has_table_privilege('service_role', expanded.table_oid, expanded.action)
      as service_role_has_table_privilege,
    count(*) filter (
      where expanded.is_permissive
        and not expanded.actor_bypasses_rls
    ) over (
      partition by
        expanded.schema_name,
        expanded.table_name,
        expanded.action,
        expanded.effective_actor
    ) as permissive_policy_count_for_actor_action
  from expanded
)
select
  schema_name,
  table_name,
  action,
  effective_actor,
  actor_bypasses_rls,
  actor_has_table_privilege,
  anon_has_table_privilege,
  authenticated_has_table_privilege,
  service_role_has_table_privilege,
  policy_name,
  is_permissive,
  declared_policy_roles,
  using_expression,
  with_check_expression,
  permissive_policy_count_for_actor_action,
  (
    is_permissive
    and not actor_bypasses_rls
    and permissive_policy_count_for_actor_action > 1
  ) as matches_multiple_permissive_warning_shape
from annotated
order by
  schema_name,
  table_name,
  action,
  effective_actor,
  policy_name;
