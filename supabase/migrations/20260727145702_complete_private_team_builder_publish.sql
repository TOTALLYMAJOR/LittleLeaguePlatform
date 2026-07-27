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
  if not exists (select 1 from pg_constraint where conname = 'team_build_plans_organization_id_id_key') then
    alter table public.team_build_plans
      add constraint team_build_plans_organization_id_id_key unique (organization_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'team_build_plans_organization_season_id_key') then
    alter table public.team_build_plans
      add constraint team_build_plans_organization_season_id_key
      unique (organization_id, season_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'team_build_plans_season_tenant_fkey') then
    alter table public.team_build_plans
      add constraint team_build_plans_season_tenant_fkey
      foreign key (organization_id, season_id)
      references public.seasons (organization_id, id)
      on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'players_team_tenant_fkey') then
    alter table public.players
      add constraint players_team_tenant_fkey
      foreign key (organization_id, season_id, team_id)
      references public.teams (organization_id, season_id, id)
      on delete cascade;
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
grant select on table public.player_team_builder_profiles to service_role;

drop policy if exists "organization admins manage team build plans"
  on public.team_build_plans;
revoke all on table public.team_build_plans from public, anon, authenticated;
grant select, insert, update on table public.team_build_plans to service_role;

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

drop index if exists public.team_build_plans_client_action_id_key;
drop index if exists public.team_build_plans_publish_action_id_key;

create unique index team_build_plans_organization_client_action_key
  on public.team_build_plans (organization_id, client_action_id)
  where client_action_id is not null;
create unique index team_build_plans_organization_publish_action_key
  on public.team_build_plans (organization_id, publish_action_id)
  where publish_action_id is not null;

create table public.team_build_plan_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  season_id uuid not null,
  plan_id uuid not null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action_id uuid not null,
  action_type text not null check (action_type in ('preview', 'edit', 'approve', 'publish')),
  request_fingerprint text not null
    check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  resulting_version integer not null check (resulting_version > 0),
  created_at timestamptz not null default now(),
  constraint team_build_plan_actions_plan_tenant_fkey
    foreign key (organization_id, plan_id)
    references public.team_build_plans (organization_id, id)
    on delete cascade,
  constraint team_build_plan_actions_plan_season_tenant_fkey
    foreign key (organization_id, season_id, plan_id)
    references public.team_build_plans (organization_id, season_id, id)
    on delete cascade
);

create unique index team_build_plan_actions_organization_action_key
  on public.team_build_plan_actions (organization_id, action_id);
create index idx_team_build_plan_actions_plan
  on public.team_build_plan_actions (organization_id, plan_id, created_at desc);

alter table public.team_build_plan_actions enable row level security;

revoke all on table public.team_build_plan_actions from public, anon, authenticated;
grant select, insert on table public.team_build_plan_actions to service_role;

create or replace function public.save_player_team_builder_profile(
  target_organization_id uuid,
  target_season_id uuid,
  target_player_id uuid,
  target_actor_user_id uuid,
  target_birth_date date,
  target_age_band text,
  target_evaluation_rating smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_row public.player_team_builder_profiles%rowtype;
begin
  if target_organization_id is null
    or target_season_id is null
    or target_player_id is null
    or target_actor_user_id is null then
    raise exception 'Organization, season, player, and verified actor are required.';
  end if;
  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only an active organization admin can save private team-builder inputs.';
  end if;
  if not exists (
    select 1
    from public.seasons season
    where season.organization_id = target_organization_id
      and season.id = target_season_id
      and season.status = 'active'
  ) then
    raise exception 'Private team-builder inputs require an active in-scope season.';
  end if;
  if not exists (
    select 1
    from public.players player
    where player.organization_id = target_organization_id
      and player.season_id = target_season_id
      and player.id = target_player_id
  ) then
    raise exception 'Player does not belong to the requested organization and season.';
  end if;

  insert into public.player_team_builder_profiles (
    player_id,
    organization_id,
    season_id,
    birth_date,
    age_band,
    evaluation_rating,
    updated_by_user_id
  ) values (
    target_player_id,
    target_organization_id,
    target_season_id,
    target_birth_date,
    target_age_band,
    target_evaluation_rating,
    target_actor_user_id
  )
  on conflict (player_id) do update
  set organization_id = excluded.organization_id,
      season_id = excluded.season_id,
      birth_date = excluded.birth_date,
      age_band = excluded.age_band,
      evaluation_rating = excluded.evaluation_rating,
      updated_by_user_id = excluded.updated_by_user_id
  returning * into profile_row;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    target_organization_id,
    target_actor_user_id,
    'team_builder_private_input_saved',
    'player_team_builder_profile',
    target_player_id::text,
    format(
      'Private team-builder profile saved with birth date %s, age band %s, and evaluation %s.',
      case when profile_row.birth_date is null then 'missing' else 'recorded' end,
      case when profile_row.age_band is null then 'missing' else 'explicit' end,
      case when profile_row.evaluation_rating is null then 'defaulted' else 'explicit' end
    )
  );

  return jsonb_build_object(
    'ok', true,
    'player_id', profile_row.player_id,
    'birth_date', profile_row.birth_date,
    'age_band', profile_row.age_band,
    'evaluation_rating', profile_row.evaluation_rating
  );
end;
$$;

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
  action_row public.team_build_plan_actions%rowtype;
  assignment_count integer;
  valid_assignment_count integer;
  next_status text;
  requested_action_type text;
  request_fingerprint text;
  roster_size_value integer;
begin
  roster_size_value := target_roster_size;
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

  requested_action_type := case
    when target_plan_id is null then 'preview'
    else 'edit'
  end;
  request_fingerprint := encode(digest(jsonb_build_object(
    'actionType', requested_action_type,
    'actionId', target_action_id,
    'actorUserId', target_actor_user_id,
    'organizationId', target_organization_id,
    'seasonId', target_season_id,
    'planId', target_plan_id,
    'expectedLockVersion', expected_lock_version,
    'division', trim(target_division),
    'targetRosterSize', target_roster_size,
    'constraints', target_constraints,
    'assignments', target_assignments,
    'warnings', to_jsonb(target_warnings),
    'balanceSummary', target_balance_summary,
    'auditSummary', target_audit_summary
  )::text, 'sha256'), 'hex');

  if target_plan_id is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        target_organization_id::text || ':' || target_action_id::text,
        0
      )
    );
  end if;

  select *
    into action_row
  from public.team_build_plan_actions action
  where action.organization_id = target_organization_id
    and action.action_id = target_action_id
  for update;
  if found then
    if action_row.season_id <> target_season_id
      or action_row.actor_user_id <> target_actor_user_id
      or action_row.action_type <> requested_action_type
      or action_row.request_fingerprint <> request_fingerprint
      or (target_plan_id is not null and action_row.plan_id <> target_plan_id) then
      raise exception 'Action identifier was already used for a different team build request.';
    end if;
    select *
      into plan_row
    from public.team_build_plans plan
    where plan.organization_id = target_organization_id
      and plan.season_id = target_season_id
      and plan.id = action_row.plan_id;
    if not found then
      raise exception 'Idempotent team build plan readback failed.';
    end if;
    return jsonb_build_object(
      'ok', true, 'plan_id', plan_row.id, 'status', plan_row.status,
      'lock_version', plan_row.lock_version, 'idempotent', true,
      'provider_execution', plan_row.provider_execution
    );
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
    insert into public.team_build_plans (
      organization_id, season_id, division, target_roster_size, status,
      constraints, assignments, warnings, balance_summary, audit_summary,
      created_by_user_id, client_action_id, last_action_id
    ) values (
      target_organization_id, target_season_id, trim(target_division), target_roster_size, 'preview',
      target_constraints, target_assignments, target_warnings, target_balance_summary, target_audit_summary,
      target_actor_user_id, target_action_id, target_action_id
    )
    on conflict (organization_id, client_action_id)
      where client_action_id is not null
      do nothing
    returning * into plan_row;
    if not found then
      select *
        into plan_row
      from public.team_build_plans plan
      where plan.organization_id = target_organization_id
        and plan.season_id = target_season_id
        and plan.client_action_id = target_action_id;
      if not found then
        raise exception 'Concurrent team build plan readback failed.';
      end if;
      select *
        into action_row
      from public.team_build_plan_actions action
      where action.organization_id = target_organization_id
        and action.action_id = target_action_id;
      if not found
        or action_row.plan_id <> plan_row.id
        or action_row.season_id <> target_season_id
        or action_row.actor_user_id <> target_actor_user_id
        or action_row.action_type <> requested_action_type
        or action_row.request_fingerprint <> request_fingerprint then
        raise exception 'Action identifier was already used for a different team build request.';
      end if;
      return jsonb_build_object(
        'ok', true, 'plan_id', plan_row.id, 'status', plan_row.status,
        'lock_version', plan_row.lock_version, 'idempotent', true,
        'provider_execution', plan_row.provider_execution
      );
    end if;
    next_status := 'preview';
  else
    select *
      into plan_row
    from public.team_build_plans plan
    where plan.id = target_plan_id
      and plan.organization_id = target_organization_id
      and plan.season_id = target_season_id
    for update;
    if not found then
      raise exception 'Team build plan does not match the requested tenant and season.';
    end if;
    if plan_row.status not in ('preview', 'edited')
      or plan_row.lock_version <> expected_lock_version then
      raise exception 'Team build plan changed or is no longer editable. Refresh before retrying.';
    end if;
    update public.team_build_plans
    set division = trim(target_division),
        target_roster_size = roster_size_value,
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
    organization_id, season_id, plan_id, actor_user_id, action_id,
    action_type, request_fingerprint, resulting_version
  ) values (
    target_organization_id, target_season_id, plan_row.id,
    target_actor_user_id, target_action_id, next_status,
    request_fingerprint, plan_row.lock_version
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
  action_row public.team_build_plan_actions%rowtype;
  request_fingerprint text;
begin
  if target_action_id is null or target_actor_user_id is null then
    raise exception 'Verified actor and action identifiers are required.';
  end if;
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

  request_fingerprint := encode(digest(jsonb_build_object(
    'actionType', 'approve',
    'actionId', target_action_id,
    'actorUserId', target_actor_user_id,
    'organizationId', plan_row.organization_id,
    'seasonId', plan_row.season_id,
    'planId', plan_row.id,
    'expectedLockVersion', expected_lock_version
  )::text, 'sha256'), 'hex');
  select *
    into action_row
  from public.team_build_plan_actions action
  where action.organization_id = plan_row.organization_id
    and action.action_id = target_action_id
  for update;
  if found then
    if action_row.season_id <> plan_row.season_id
      or action_row.plan_id <> plan_row.id
      or action_row.actor_user_id <> target_actor_user_id
      or action_row.action_type <> 'approve'
      or action_row.request_fingerprint <> request_fingerprint then
      raise exception 'Action identifier was already used for a different team build request.';
    end if;
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
    organization_id, season_id, plan_id, actor_user_id, action_id,
    action_type, request_fingerprint, resulting_version
  ) values (
    plan_row.organization_id, plan_row.season_id, plan_row.id,
    target_actor_user_id, target_action_id, 'approve',
    request_fingerprint, plan_row.lock_version
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
  action_row public.team_build_plan_actions%rowtype;
  assignment_count integer;
  updated_count integer;
  request_fingerprint text;
  season_status text;
begin
  if target_action_id is null or target_actor_user_id is null then
    raise exception 'Verified actor and action identifiers are required.';
  end if;
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

  request_fingerprint := encode(digest(jsonb_build_object(
    'actionType', 'publish',
    'actionId', target_action_id,
    'actorUserId', target_actor_user_id,
    'organizationId', plan_row.organization_id,
    'seasonId', plan_row.season_id,
    'planId', plan_row.id,
    'expectedLockVersion', expected_lock_version
  )::text, 'sha256'), 'hex');
  select *
    into action_row
  from public.team_build_plan_actions action
  where action.organization_id = plan_row.organization_id
    and action.action_id = target_action_id
  for update;
  if found then
    if action_row.season_id <> plan_row.season_id
      or action_row.plan_id <> plan_row.id
      or action_row.actor_user_id <> target_actor_user_id
      or action_row.action_type <> 'publish'
      or action_row.request_fingerprint <> request_fingerprint then
      raise exception 'Action identifier was already used for a different team build request.';
    end if;
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

  select season.status
    into season_status
  from public.seasons season
  where season.organization_id = plan_row.organization_id
    and season.id = plan_row.season_id
  for update;
  if not found or season_status <> 'active' then
    raise exception 'Team build season is unavailable or read-only.';
  end if;

  perform team.id
  from public.teams team
  where team.organization_id = plan_row.organization_id
    and team.season_id = plan_row.season_id
    and team.division = plan_row.division
  order by team.id
  for update;

  perform player.id
  from public.players player
  join public.teams source_team
    on source_team.organization_id = player.organization_id
   and source_team.season_id = player.season_id
   and source_team.id = player.team_id
   and source_team.division = plan_row.division
  where player.organization_id = plan_row.organization_id
    and player.season_id = plan_row.season_id
  order by player.id
  for update of player;

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
    and player.season_id = plan_row.season_id
    and coalesce(player.roster_status, 'active') = 'active'
    and exists (
      select 1
      from public.teams target_team
      where target_team.organization_id = plan_row.organization_id
        and target_team.season_id = plan_row.season_id
        and target_team.id = assignment.team_id
        and target_team.division = plan_row.division
        and target_team.status = 'active'
    );
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
    organization_id, season_id, plan_id, actor_user_id, action_id,
    action_type, request_fingerprint, resulting_version
  ) values (
    plan_row.organization_id, plan_row.season_id, plan_row.id,
    target_actor_user_id, target_action_id, 'publish',
    request_fingerprint, plan_row.lock_version
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

revoke all on function public.save_player_team_builder_profile(
  uuid, uuid, uuid, uuid, date, text, smallint
) from public, anon, authenticated;
revoke all on function public.save_team_build_plan(
  uuid, uuid, uuid, text, integer, jsonb, jsonb, text[], jsonb, text, uuid, integer, uuid
) from public, anon, authenticated;
revoke all on function public.approve_team_build_plan(uuid, uuid, integer, uuid)
  from public, anon, authenticated;
revoke all on function public.publish_team_build_plan(uuid, uuid, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.save_player_team_builder_profile(
  uuid, uuid, uuid, uuid, date, text, smallint
) to service_role;
grant execute on function public.save_team_build_plan(
  uuid, uuid, uuid, text, integer, jsonb, jsonb, text[], jsonb, text, uuid, integer, uuid
) to service_role;
grant execute on function public.approve_team_build_plan(uuid, uuid, integer, uuid)
  to service_role;
grant execute on function public.publish_team_build_plan(uuid, uuid, integer, uuid)
  to service_role;
