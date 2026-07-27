-- LP-007 / LP-008: private team-builder inputs and reviewed atomic publish.
-- The private profile is deliberately separate from parent-readable players.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'seasons_organization_id_id_key') then
    alter table public.seasons
      add constraint seasons_organization_id_id_key unique (organization_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teams_organization_season_id_key') then
    alter table public.teams
      add constraint teams_organization_season_id_key unique (organization_id, season_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'players_organization_season_id_key') then
    alter table public.players
      add constraint players_organization_season_id_key unique (organization_id, season_id, id);
  end if;
end
$$;

create table public.player_team_builder_profiles (
  player_id uuid primary key,
  organization_id uuid not null,
  season_id uuid not null,
  birth_date date,
  age_band text check (
    age_band is null
    or (char_length(age_band) between 2 and 8 and age_band ~ '^[0-9]{1,2}[Uu]$')
  ),
  evaluation_rating smallint check (evaluation_rating between 1 and 5),
  updated_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_team_builder_profiles_player_tenant_fkey
    foreign key (organization_id, season_id, player_id)
    references public.players (organization_id, season_id, id)
    on delete cascade
);

create index idx_player_team_builder_profiles_org_season
  on public.player_team_builder_profiles (organization_id, season_id);

create trigger touch_player_team_builder_profiles_updated_at
  before update on public.player_team_builder_profiles
  for each row execute function public.touch_updated_at();

alter table public.player_team_builder_profiles enable row level security;

-- The application uses its verified-session server adapter. Browser roles,
-- including parents and team-portal users, have no Data API table grant and
-- RLS has no permissive browser policy. Active-admin checks live in the
-- verified-session service before service-role access.
revoke all on table public.player_team_builder_profiles from public, anon, authenticated;
grant select, insert, update on table public.player_team_builder_profiles to service_role;

alter table public.team_build_plans
  add column lock_version integer not null default 1 check (lock_version > 0),
  add column client_action_id uuid,
  add column last_action_id uuid,
  add column balance_summary jsonb not null default '{}'::jsonb,
  add column audit_summary text not null default '',
  add column published_by_user_id uuid references public.profiles(id) on delete set null,
  add column publish_action_id uuid,
  add column provider_execution text not null default 'not_started'
    check (provider_execution = 'not_started');

create unique index team_build_plans_client_action_id_key
  on public.team_build_plans (client_action_id)
  where client_action_id is not null;
create unique index team_build_plans_publish_action_id_key
  on public.team_build_plans (publish_action_id)
  where publish_action_id is not null;

create table public.team_build_plan_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.team_build_plans(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action_id uuid not null unique,
  action_type text not null check (action_type in ('preview', 'edit', 'approve', 'publish')),
  resulting_version integer not null check (resulting_version > 0),
  created_at timestamptz not null default now()
);

create index idx_team_build_plan_actions_plan
  on public.team_build_plan_actions (organization_id, plan_id, created_at desc);

alter table public.team_build_plan_actions enable row level security;

revoke all on table public.team_build_plan_actions from public, anon, authenticated;
grant select, insert on table public.team_build_plan_actions to service_role;

create or replace function public.save_team_build_plan(
  target_plan_id uuid,
  target_organization_id uuid,
  target_season_id uuid,
  target_division text,
  target_roster_size integer,
  target_constraints jsonb,
  target_assignments jsonb,
  target_warnings text[],
  target_balance_summary jsonb,
  target_audit_summary text,
  target_actor_user_id uuid,
  expected_lock_version integer,
  target_action_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  plan_row public.team_build_plans%rowtype;
  assignment_count integer;
  valid_assignment_count integer;
  next_status text;
begin
  if target_action_id is null or target_actor_user_id is null then
    raise exception 'Verified actor and action identifiers are required.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only an active organization admin can save a team build plan.';
  end if;
  if not exists (
    select 1 from public.seasons season
    where season.id = target_season_id
      and season.organization_id = target_organization_id
      and season.status = 'active'
  ) then
    raise exception 'Team build season is unavailable or read-only.';
  end if;
  if nullif(trim(target_division), '') is null
    or target_roster_size < 1 or target_roster_size > 30
    or jsonb_typeof(target_assignments) <> 'array'
    or jsonb_typeof(target_constraints) <> 'object'
    or jsonb_typeof(target_balance_summary) <> 'object' then
    raise exception 'Team build plan payload is invalid.';
  end if;

  select count(*), count(distinct assignment.player_id)
    into assignment_count, valid_assignment_count
  from (
    select (item->>'playerId')::uuid as player_id
    from jsonb_array_elements(target_assignments) item
  ) assignment;
  if assignment_count < 1 or assignment_count <> valid_assignment_count then
    raise exception 'Every plan player must have exactly one assignment.';
  end if;

  select count(*) into valid_assignment_count
  from jsonb_array_elements(target_assignments) item
  join public.players player
    on player.id = (item->>'playerId')::uuid
   and player.organization_id = target_organization_id
   and player.season_id = target_season_id
  join public.teams source_team
    on source_team.id = player.team_id
   and source_team.organization_id = target_organization_id
   and source_team.season_id = target_season_id
   and source_team.division = target_division
  join public.teams target_team
    on target_team.id = (item->>'teamId')::uuid
   and target_team.organization_id = target_organization_id
   and target_team.season_id = target_season_id
   and target_team.division = target_division
   and target_team.status = 'active';
  if valid_assignment_count <> assignment_count then
    raise exception 'Plan assignments must use in-scope organization, season, division, team, and player records.';
  end if;

  if target_plan_id is null then
    if expected_lock_version <> 0 then
      raise exception 'New plan version must start at zero.';
    end if;
    select * into plan_row
    from public.team_build_plans
    where client_action_id = target_action_id;
    if found then
      return jsonb_build_object(
        'ok', true, 'plan_id', plan_row.id, 'status', plan_row.status,
        'lock_version', plan_row.lock_version, 'idempotent', true,
        'provider_execution', plan_row.provider_execution
      );
    end if;
    insert into public.team_build_plans (
      organization_id, season_id, division, target_roster_size, status,
      constraints, assignments, warnings, balance_summary, audit_summary,
      created_by_user_id, client_action_id, last_action_id
    ) values (
      target_organization_id, target_season_id, trim(target_division), target_roster_size, 'preview',
      target_constraints, target_assignments, target_warnings, target_balance_summary, target_audit_summary,
      target_actor_user_id, target_action_id, target_action_id
    ) returning * into plan_row;
    next_status := 'preview';
  else
    select * into plan_row from public.team_build_plans
    where id = target_plan_id
    for update;
    if not found
      or plan_row.organization_id <> target_organization_id
      or plan_row.season_id <> target_season_id then
      raise exception 'Team build plan does not match the requested tenant and season.';
    end if;
    if exists (
      select 1 from public.team_build_plan_actions
      where plan_id = plan_row.id and action_id = target_action_id
    ) then
      return jsonb_build_object(
        'ok', true, 'plan_id', plan_row.id, 'status', plan_row.status,
        'lock_version', plan_row.lock_version, 'idempotent', true,
        'provider_execution', plan_row.provider_execution
      );
    end if;
    if plan_row.status not in ('preview', 'edited')
      or plan_row.lock_version <> expected_lock_version then
      raise exception 'Team build plan changed or is no longer editable. Refresh before retrying.';
    end if;
    update public.team_build_plans
    set division = trim(target_division),
        target_roster_size = target_roster_size,
        status = 'edited',
        constraints = target_constraints,
        assignments = target_assignments,
        warnings = target_warnings,
        balance_summary = target_balance_summary,
        audit_summary = target_audit_summary,
        last_action_id = target_action_id,
        lock_version = lock_version + 1
    where id = plan_row.id
    returning * into plan_row;
    next_status := 'edit';
  end if;

  insert into public.team_build_plan_actions (
    organization_id, plan_id, actor_user_id, action_id, action_type, resulting_version
  ) values (
    target_organization_id, plan_row.id, target_actor_user_id, target_action_id,
    next_status, plan_row.lock_version
  );
  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    target_organization_id, target_actor_user_id,
    case when next_status = 'preview' then 'team_build_preview_saved' else 'team_build_plan_edited' end,
    'team_build_plan', plan_row.id::text, target_audit_summary
  );
  return jsonb_build_object(
    'ok', true, 'plan_id', plan_row.id, 'status', plan_row.status,
    'lock_version', plan_row.lock_version, 'idempotent', false,
    'provider_execution', plan_row.provider_execution
  );
end;
$$;

create or replace function public.approve_team_build_plan(
  target_plan_id uuid,
  target_actor_user_id uuid,
  expected_lock_version integer,
  target_action_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  plan_row public.team_build_plans%rowtype;
begin
  select * into plan_row from public.team_build_plans
  where id = target_plan_id
  for update;
  if not found then raise exception 'Team build plan is unavailable.'; end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = plan_row.organization_id
      and membership.user_id = target_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only an active organization admin can approve a team build plan.';
  end if;
  if exists (
    select 1 from public.team_build_plan_actions
    where plan_id = plan_row.id and action_id = target_action_id
  ) then
    return jsonb_build_object(
      'ok', true, 'plan_id', plan_row.id, 'status', plan_row.status,
      'lock_version', plan_row.lock_version, 'idempotent', true,
      'provider_execution', plan_row.provider_execution
    );
  end if;
  if plan_row.status not in ('preview', 'edited')
    or plan_row.lock_version <> expected_lock_version then
    raise exception 'Team build plan changed or cannot be approved. Refresh before retrying.';
  end if;
  update public.team_build_plans
  set status = 'approved',
      approved_by_user_id = target_actor_user_id,
      approved_at = now(),
      last_action_id = target_action_id,
      lock_version = lock_version + 1
  where id = plan_row.id
  returning * into plan_row;
  insert into public.team_build_plan_actions (
    organization_id, plan_id, actor_user_id, action_id, action_type, resulting_version
  ) values (
    plan_row.organization_id, plan_row.id, target_actor_user_id,
    target_action_id, 'approve', plan_row.lock_version
  );
  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    plan_row.organization_id, target_actor_user_id, 'team_build_plan_approved',
    'team_build_plan', plan_row.id::text,
    plan_row.audit_summary || ' Assignments approved for atomic publish.'
  );
  return jsonb_build_object(
    'ok', true, 'plan_id', plan_row.id, 'status', plan_row.status,
    'lock_version', plan_row.lock_version, 'idempotent', false,
    'provider_execution', plan_row.provider_execution
  );
end;
$$;

create or replace function public.publish_team_build_plan(
  target_plan_id uuid,
  target_actor_user_id uuid,
  expected_lock_version integer,
  target_action_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  plan_row public.team_build_plans%rowtype;
  assignment_count integer;
  updated_count integer;
begin
  select * into plan_row from public.team_build_plans
  where id = target_plan_id
  for update;
  if not found then raise exception 'Team build plan is unavailable.'; end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = plan_row.organization_id
      and membership.user_id = target_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only an active organization admin can publish a team build plan.';
  end if;
  if plan_row.status = 'published' and plan_row.publish_action_id = target_action_id then
    return jsonb_build_object(
      'ok', true, 'plan_id', plan_row.id, 'status', plan_row.status,
      'lock_version', plan_row.lock_version, 'idempotent', true,
      'updated_assignments', 0, 'provider_execution', plan_row.provider_execution
    );
  end if;
  if plan_row.status <> 'approved'
    or plan_row.lock_version <> expected_lock_version then
    raise exception 'Approved team build plan changed or was already published. Refresh before retrying.';
  end if;
  if plan_row.approved_by_user_id is null or plan_row.approved_at is null then
    raise exception 'Approved assignment evidence is incomplete.';
  end if;
  if not exists (
    select 1 from public.seasons season
    where season.id = plan_row.season_id
      and season.organization_id = plan_row.organization_id
      and season.status = 'active'
  ) then
    raise exception 'Team build season is unavailable or read-only.';
  end if;

  select count(*) into assignment_count
  from jsonb_array_elements(plan_row.assignments);
  if assignment_count < 1
    or assignment_count <> (
      select count(distinct (item->>'playerId')::uuid)
      from jsonb_array_elements(plan_row.assignments) item
    )
    or assignment_count <> (
      select count(*)
      from public.players player
      join public.teams source_team on source_team.id = player.team_id
      where player.organization_id = plan_row.organization_id
        and player.season_id = plan_row.season_id
        and source_team.organization_id = plan_row.organization_id
        and source_team.season_id = plan_row.season_id
        and source_team.division = plan_row.division
        and coalesce(player.roster_status, 'active') = 'active'
    ) then
    raise exception 'Approved assignments no longer match the in-scope active roster.';
  end if;
  if assignment_count <> (
    select count(*)
    from jsonb_array_elements(plan_row.assignments) item
    join public.players player
      on player.id = (item->>'playerId')::uuid
     and player.organization_id = plan_row.organization_id
     and player.season_id = plan_row.season_id
    join public.teams target_team
      on target_team.id = (item->>'teamId')::uuid
     and target_team.organization_id = plan_row.organization_id
     and target_team.season_id = plan_row.season_id
     and target_team.division = plan_row.division
     and target_team.status = 'active'
    where coalesce(player.roster_status, 'active') = 'active'
  ) then
    raise exception 'Approved assignments contain an out-of-scope team or player.';
  end if;

  update public.players player
  set team_id = assignment.team_id
  from (
    select (item->>'playerId')::uuid as player_id,
           (item->>'teamId')::uuid as team_id
    from jsonb_array_elements(plan_row.assignments) item
  ) assignment
  where player.id = assignment.player_id
    and player.organization_id = plan_row.organization_id
    and player.season_id = plan_row.season_id;
  get diagnostics updated_count = row_count;
  if updated_count <> assignment_count then
    raise exception 'Atomic publish did not update the complete approved assignment set.';
  end if;

  update public.team_build_plans
  set status = 'published',
      published_by_user_id = target_actor_user_id,
      published_at = now(),
      publish_action_id = target_action_id,
      last_action_id = target_action_id,
      lock_version = lock_version + 1
  where id = plan_row.id
  returning * into plan_row;
  insert into public.team_build_plan_actions (
    organization_id, plan_id, actor_user_id, action_id, action_type, resulting_version
  ) values (
    plan_row.organization_id, plan_row.id, target_actor_user_id,
    target_action_id, 'publish', plan_row.lock_version
  );
  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    plan_row.organization_id, target_actor_user_id, 'team_build_plan_published',
    'team_build_plan', plan_row.id::text,
    plan_row.audit_summary || format(
      ' Published %s assignment(s) atomically. Provider execution: not started.',
      assignment_count
    )
  );
  return jsonb_build_object(
    'ok', true, 'plan_id', plan_row.id, 'status', plan_row.status,
    'lock_version', plan_row.lock_version, 'idempotent', false,
    'updated_assignments', updated_count, 'provider_execution', plan_row.provider_execution
  );
end;
$$;

revoke all on function public.save_team_build_plan(
  uuid, uuid, uuid, text, integer, jsonb, jsonb, text[], jsonb, text, uuid, integer, uuid
) from public, anon, authenticated;
revoke all on function public.approve_team_build_plan(uuid, uuid, integer, uuid)
  from public, anon, authenticated;
revoke all on function public.publish_team_build_plan(uuid, uuid, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.save_team_build_plan(
  uuid, uuid, uuid, text, integer, jsonb, jsonb, text[], jsonb, text, uuid, integer, uuid
) to service_role;
grant execute on function public.approve_team_build_plan(uuid, uuid, integer, uuid)
  to service_role;
grant execute on function public.publish_team_build_plan(uuid, uuid, integer, uuid)
  to service_role;
