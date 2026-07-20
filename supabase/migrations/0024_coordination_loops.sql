-- LeaguePilot coordination loops.
-- This migration completes five connected workflows without changing existing
-- workflow enums or allowing provider, access, or safety decisions to bypass
-- a verified human actor.

alter table public.roster_imports
  add column if not exists committed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists commit_manifest_json jsonb not null default '{}'::jsonb,
  add column if not exists warnings_confirmed boolean not null default false,
  add column if not exists rolled_back_at timestamptz,
  add column if not exists rolled_back_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists rollback_reason text;

alter table public.players
  add column if not exists source_roster_import_id uuid references public.roster_imports(id) on delete set null;

alter table public.parent_invites
  add column if not exists source_roster_import_id uuid references public.roster_imports(id) on delete set null;

alter table public.player_guardians
  add column if not exists source_roster_import_id uuid references public.roster_imports(id) on delete set null;

alter table public.team_memberships
  add column if not exists source_roster_import_id uuid references public.roster_imports(id) on delete set null;

create index if not exists idx_players_source_roster_import
  on public.players(source_roster_import_id)
  where source_roster_import_id is not null;

create index if not exists idx_parent_invites_source_roster_import
  on public.parent_invites(source_roster_import_id)
  where source_roster_import_id is not null;

create index if not exists idx_player_guardians_source_roster_import
  on public.player_guardians(source_roster_import_id)
  where source_roster_import_id is not null;

create index if not exists idx_team_memberships_source_roster_import
  on public.team_memberships(source_roster_import_id)
  where source_roster_import_id is not null;

create table if not exists public.practice_run_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  coach_user_id uuid not null references public.profiles(id) on delete restrict,
  plan_json jsonb not null default '{}'::jsonb,
  observations_json jsonb not null default '{}'::jsonb,
  parent_replay_id uuid references public.parent_replays(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_event_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  requested_by_user_id uuid not null references public.profiles(id) on delete cascade,
  caregiver_label text not null check (char_length(trim(caregiver_label)) between 2 and 120),
  note text check (note is null or char_length(trim(note)) between 2 and 1000),
  confirmed_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id, requested_by_user_id)
);

create table if not exists public.game_day_resolution_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  weather_alert_id uuid references public.weather_alerts(id) on delete set null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null check (decision in ('monitor', 'confirm_on_time', 'delay', 'cancel')),
  reason text not null check (char_length(trim(reason)) between 10 and 2000),
  evidence_json jsonb not null default '{}'::jsonb,
  original_event_json jsonb not null default '{}'::jsonb,
  applied_event_json jsonb not null default '{}'::jsonb,
  affected_recipient_count integer not null default 0 check (affected_recipient_count >= 0),
  notification_count integer not null default 0 check (notification_count >= 0),
  reviewed_at timestamptz not null default now(),
  applied_at timestamptz,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

drop trigger if exists touch_practice_run_receipts_updated_at on public.practice_run_receipts;
create trigger touch_practice_run_receipts_updated_at
  before update on public.practice_run_receipts
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_family_event_handoffs_updated_at on public.family_event_handoffs;
create trigger touch_family_event_handoffs_updated_at
  before update on public.family_event_handoffs
  for each row execute function public.touch_updated_at();

create index if not exists idx_practice_run_receipts_team_event
  on public.practice_run_receipts(team_id, event_id, created_at desc);

create index if not exists idx_family_event_handoffs_parent_event
  on public.family_event_handoffs(requested_by_user_id, event_id, cancelled_at);

create index if not exists idx_game_day_resolution_event
  on public.game_day_resolution_reviews(event_id, reviewed_at desc);

alter table public.practice_run_receipts enable row level security;
alter table public.family_event_handoffs enable row level security;
alter table public.game_day_resolution_reviews enable row level security;

create policy "coaches and admins manage practice run receipts"
on public.practice_run_receipts
for all
using (public.current_user_can_manage_team(team_id))
with check (
  public.current_user_can_manage_team(team_id)
  and coach_user_id = auth.uid()
);

create policy "guardians read own family handoff plans"
on public.family_event_handoffs
for select
using (
  requested_by_user_id = auth.uid()
  and exists (
    select 1
    from public.player_guardians guardian
    join public.players player on player.id = guardian.player_id
    join public.events event on event.id = family_event_handoffs.event_id
    where guardian.player_id = family_event_handoffs.player_id
      and guardian.parent_user_id = auth.uid()
      and guardian.status = 'active'
      and player.team_id = family_event_handoffs.team_id
      and event.team_id = family_event_handoffs.team_id
  )
);

create policy "guardians create own family handoff plans"
on public.family_event_handoffs
for insert
with check (
  requested_by_user_id = auth.uid()
  and exists (
    select 1
    from public.player_guardians guardian
    join public.players player on player.id = guardian.player_id
    join public.events event on event.id = family_event_handoffs.event_id
    where guardian.player_id = family_event_handoffs.player_id
      and guardian.parent_user_id = auth.uid()
      and guardian.status = 'active'
      and player.team_id = family_event_handoffs.team_id
      and event.team_id = family_event_handoffs.team_id
  )
);

create policy "guardians update own family handoff plans"
on public.family_event_handoffs
for update
using (requested_by_user_id = auth.uid())
with check (
  requested_by_user_id = auth.uid()
  and exists (
    select 1
    from public.player_guardians guardian
    join public.players player on player.id = guardian.player_id
    join public.events event on event.id = family_event_handoffs.event_id
    where guardian.player_id = family_event_handoffs.player_id
      and guardian.parent_user_id = auth.uid()
      and guardian.status = 'active'
      and player.team_id = family_event_handoffs.team_id
      and event.team_id = family_event_handoffs.team_id
  )
);

create policy "team staff read family handoff plans"
on public.family_event_handoffs
for select
using (public.current_user_can_manage_team(team_id));

create policy "coaches and admins manage game day resolution reviews"
on public.game_day_resolution_reviews
for all
using (public.current_user_can_manage_team(team_id))
with check (
  public.current_user_can_manage_team(team_id)
  and actor_user_id = auth.uid()
);

create or replace function public.commit_roster_import(
  p_roster_import_id uuid,
  p_actor_user_id uuid,
  p_confirm_warnings boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  import_row public.roster_imports%rowtype;
  staged_row public.roster_import_rows%rowtype;
  team_row public.teams%rowtype;
  player_row public.players%rowtype;
  parent_profile public.profiles%rowtype;
  invite_row public.parent_invites%rowtype;
  normalized jsonb;
  normalized_email text;
  normalized_phone text;
  invite_email text;
  created_players integer := 0;
  created_guardians integer := 0;
  created_memberships integer := 0;
  created_invites integer := 0;
  skipped_rows integer := 0;
  warning_count integer := 0;
  error_count integer := 0;
  manifest jsonb;
begin
  select *
  into import_row
  from public.roster_imports
  where id = p_roster_import_id
  for update;

  if import_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Roster import was not found.');
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = import_row.organization_id
      and membership.user_id = p_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'message', 'Only an active organization admin can commit a roster import.');
  end if;

  if import_row.committed_at is not null and import_row.rolled_back_at is null then
    return jsonb_build_object(
      'ok', true,
      'idempotentReplay', true,
      'message', 'Roster import was already committed. No duplicate records were created.',
      'rosterImportId', import_row.id,
      'manifest', import_row.commit_manifest_json
    );
  end if;

  if import_row.rolled_back_at is not null then
    return jsonb_build_object('ok', false, 'code', 'rolled_back', 'message', 'A rolled-back roster import cannot be committed again. Validate a new import.');
  end if;

  select
    count(*) filter (where status = 'warning'),
    count(*) filter (where status = 'error')
  into warning_count, error_count
  from public.roster_import_rows
  where roster_import_id = import_row.id;

  if error_count > 0 then
    return jsonb_build_object('ok', false, 'code', 'blocking_errors', 'message', 'Resolve blocking roster errors before approval.', 'errorRows', error_count);
  end if;

  if warning_count > 0 and not p_confirm_warnings then
    return jsonb_build_object('ok', false, 'code', 'warnings_unconfirmed', 'message', 'Confirm reviewed warning rows before approval.', 'warningRows', warning_count);
  end if;

  for staged_row in
    select *
    from public.roster_import_rows
    where roster_import_id = import_row.id
      and status in ('valid', 'warning')
    order by row_number
  loop
    normalized := staged_row.normalized_data;

    select *
    into team_row
    from public.teams
    where id = nullif(normalized->>'teamId', '')::uuid
      and organization_id = import_row.organization_id
      and season_id = import_row.season_id
    for share;

    if team_row.id is null then
      raise exception 'Roster row % references a team outside the approved organization and season.', staged_row.row_number;
    end if;

    select *
    into player_row
    from public.players
    where team_id = team_row.id
      and lower(first_name) = lower(trim(normalized->>'firstName'))
      and upper(last_initial) = upper(trim(normalized->>'lastInitial'))
    limit 1;

    if player_row.id is not null then
      skipped_rows := skipped_rows + 1;
      continue;
    end if;

    insert into public.players (
      organization_id,
      season_id,
      team_id,
      first_name,
      last_initial,
      jersey,
      source_roster_import_id
    ) values (
      import_row.organization_id,
      import_row.season_id,
      team_row.id,
      trim(normalized->>'firstName'),
      upper(trim(normalized->>'lastInitial')),
      nullif(trim(normalized->>'jersey'), ''),
      import_row.id
    )
    returning * into player_row;
    created_players := created_players + 1;

    normalized_email := lower(trim(coalesce(normalized->>'parentEmail', '')));
    normalized_phone := regexp_replace(coalesce(normalized->>'parentPhone', ''), '[^0-9]+', '', 'g');

    select *
    into parent_profile
    from public.profiles
    where (normalized_email <> '' and lower(email) = normalized_email)
       or (normalized_phone <> '' and regexp_replace(coalesce(phone, ''), '[^0-9]+', '', 'g') = normalized_phone)
    order by created_at
    limit 1;

    if parent_profile.id is not null then
      insert into public.player_guardians (
        player_id,
        parent_user_id,
        relationship,
        status,
        source_roster_import_id
      ) values (
        player_row.id,
        parent_profile.id,
        'guardian',
        'active',
        import_row.id
      );
      created_guardians := created_guardians + 1;

      insert into public.team_memberships (
        team_id,
        user_id,
        role,
        status,
        source_roster_import_id
      ) values (
        team_row.id,
        parent_profile.id,
        'parent',
        'active',
        import_row.id
      )
      on conflict (team_id, user_id, role) do nothing;
      if found then
        created_memberships := created_memberships + 1;
      end if;
    else
      invite_email := case
        when normalized_email <> '' then normalized_email
        else 'phone-' || substr(encode(digest(normalized_phone, 'sha256'), 'hex'), 1, 16) || '@pending.leaguepilot.invalid'
      end;

      insert into public.parent_invites (
        organization_id,
        team_id,
        player_id,
        email,
        phone,
        invite_token_hash,
        status,
        delivery_status,
        expires_at,
        source_roster_import_id
      ) values (
        import_row.organization_id,
        team_row.id,
        player_row.id,
        invite_email,
        nullif(normalized_phone, ''),
        encode(digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex'),
        'pending',
        case when normalized_email <> '' then 'queued' else 'failed' end,
        now() + interval '7 days',
        import_row.id
      )
      returning * into invite_row;
      created_invites := created_invites + 1;

      insert into public.player_guardians (
        player_id,
        parent_invite_id,
        relationship,
        status,
        source_roster_import_id
      ) values (
        player_row.id,
        invite_row.id,
        'guardian',
        'invited',
        import_row.id
      );
      created_guardians := created_guardians + 1;
    end if;
  end loop;

  manifest := jsonb_build_object(
    'createdPlayers', created_players,
    'createdGuardians', created_guardians,
    'createdMemberships', created_memberships,
    'createdInvites', created_invites,
    'skippedRows', skipped_rows,
    'warningRows', warning_count,
    'providerSendsExecuted', 0
  );

  update public.roster_imports
  set
    status = 'committed',
    committed_at = now(),
    committed_by_user_id = p_actor_user_id,
    commit_manifest_json = manifest,
    warnings_confirmed = p_confirm_warnings
  where id = import_row.id;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    import_row.organization_id,
    p_actor_user_id,
    'roster_import_committed',
    'roster_import',
    import_row.id::text,
    format('Roster import committed: %s player(s), %s guardian link(s), %s invite(s), and zero provider sends.', created_players, created_guardians, created_invites)
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Roster import committed after admin approval. Invite records remain provider-gated.',
    'rosterImportId', import_row.id,
    'manifest', manifest
  );
end;
$$;

create or replace function public.rollback_roster_import(
  p_roster_import_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  import_row public.roster_imports%rowtype;
  downstream_activity bigint := 0;
  deleted_players integer := 0;
  deleted_guardians integer := 0;
  deleted_memberships integer := 0;
  deleted_invites integer := 0;
begin
  if char_length(trim(coalesce(p_reason, ''))) < 10 then
    return jsonb_build_object('ok', false, 'code', 'reason_required', 'message', 'Rollback requires a reason of at least 10 characters.');
  end if;

  select *
  into import_row
  from public.roster_imports
  where id = p_roster_import_id
  for update;

  if import_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Roster import was not found.');
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = import_row.organization_id
      and membership.user_id = p_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'message', 'Only an active organization admin can roll back a roster import.');
  end if;

  if import_row.committed_at is null then
    return jsonb_build_object('ok', false, 'code', 'not_committed', 'message', 'Only a committed roster import can be rolled back.');
  end if;

  if import_row.rolled_back_at is not null then
    return jsonb_build_object('ok', true, 'idempotentReplay', true, 'message', 'Roster import was already rolled back.');
  end if;

  select
    (select count(*) from public.rsvps item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id) +
    (select count(*) from public.rsvp_change_logs item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id) +
    (select count(*) from public.event_attendance item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id) +
    (select count(*) from public.guardian_authorizations item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id) +
    (select count(*) from public.emergency_contacts item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id) +
    (select count(*) from public.player_health_notes item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id) +
    (select count(*) from public.learning_plans item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id) +
    (select count(*) from public.player_media_consents item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id) +
    (select count(*) from public.family_obligations item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id) +
    (select count(*) from public.family_event_handoffs item join public.players player on player.id = item.player_id where player.source_roster_import_id = import_row.id)
  into downstream_activity;

  if downstream_activity > 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'downstream_activity',
      'message', 'Rollback is blocked because imported players already have family, attendance, safety, media, learning, or payment activity.',
      'downstreamActivityCount', downstream_activity
    );
  end if;

  delete from public.team_memberships
  where source_roster_import_id = import_row.id;
  get diagnostics deleted_memberships = row_count;

  delete from public.player_guardians
  where source_roster_import_id = import_row.id;
  get diagnostics deleted_guardians = row_count;

  delete from public.parent_invites
  where source_roster_import_id = import_row.id;
  get diagnostics deleted_invites = row_count;

  delete from public.players
  where source_roster_import_id = import_row.id;
  get diagnostics deleted_players = row_count;

  update public.roster_imports
  set
    rolled_back_at = now(),
    rolled_back_by_user_id = p_actor_user_id,
    rollback_reason = trim(p_reason)
  where id = import_row.id;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    import_row.organization_id,
    p_actor_user_id,
    'roster_import_rolled_back',
    'roster_import',
    import_row.id::text,
    format('Roster import rollback removed %s player(s), %s guardian link(s), %s invite(s), and %s membership(s).', deleted_players, deleted_guardians, deleted_invites, deleted_memberships)
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Roster import rollback completed without deleting downstream family or operational activity.',
    'removed', jsonb_build_object(
      'players', deleted_players,
      'guardians', deleted_guardians,
      'invites', deleted_invites,
      'memberships', deleted_memberships
    )
  );
end;
$$;

revoke all on function public.commit_roster_import(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.rollback_roster_import(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.commit_roster_import(uuid, uuid, boolean) to service_role;
grant execute on function public.rollback_roster_import(uuid, uuid, text) to service_role;

create or replace function public.apply_game_day_resolution(
  p_event_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_reason text,
  p_starts_at timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.events%rowtype;
  weather_row public.weather_alerts%rowtype;
  review_row public.game_day_resolution_reviews%rowtype;
  original_event jsonb;
  applied_event jsonb;
  recipient_ids uuid[];
  recipient_id uuid;
  recipient_count integer := 0;
  notification_count integer := 0;
  duration interval;
  next_starts_at timestamptz;
  next_ends_at timestamptz;
  next_status text;
  now_value timestamptz := now();
begin
  if p_decision not in ('monitor', 'confirm_on_time', 'delay', 'cancel') then
    return jsonb_build_object('ok', false, 'code', 'invalid_decision', 'message', 'Unsupported game-day resolution decision.');
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 10 then
    return jsonb_build_object('ok', false, 'code', 'reason_required', 'message', 'Game-day resolution requires a reason of at least 10 characters.');
  end if;
  if char_length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    return jsonb_build_object('ok', false, 'code', 'receipt_required', 'message', 'Game-day resolution requires an action receipt.');
  end if;

  select *
  into review_row
  from public.game_day_resolution_reviews
  where idempotency_key = p_idempotency_key;
  if review_row.id is not null then
    return jsonb_build_object(
      'ok', true,
      'idempotentReplay', true,
      'message', 'Game-day resolution was already reviewed. No duplicate event change or notification drafts were created.',
      'reviewId', review_row.id,
      'notificationCount', review_row.notification_count
    );
  end if;

  select *
  into event_row
  from public.events
  where id = p_event_id
  for update;
  if event_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Game-day event was not found.');
  end if;

  if not (
    exists (
      select 1 from public.team_memberships membership
      where membership.team_id = event_row.team_id
        and membership.user_id = p_actor_user_id
        and membership.role = 'coach'
        and membership.status = 'active'
    )
    or exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = event_row.organization_id
        and membership.user_id = p_actor_user_id
        and membership.role = 'admin'
        and membership.status = 'active'
    )
  ) then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'message', 'Only assigned coaches or organization admins can resolve a game-day event.');
  end if;

  select *
  into weather_row
  from public.weather_alerts
  where event_id = event_row.id
  order by created_at desc
  limit 1;

  original_event := to_jsonb(event_row);
  applied_event := original_event;
  duration := event_row.ends_at - event_row.starts_at;
  next_starts_at := event_row.starts_at;
  next_ends_at := event_row.ends_at;
  next_status := event_row.status;

  if p_decision = 'delay' then
    if p_starts_at is null or p_starts_at <= now_value then
      return jsonb_build_object('ok', false, 'code', 'delay_time_required', 'message', 'A delayed event requires a future start time.');
    end if;
    next_starts_at := p_starts_at;
    next_ends_at := p_starts_at + duration;
  elsif p_decision = 'cancel' then
    next_status := 'cancelled';
  end if;

  if p_decision in ('delay', 'cancel') then
    update public.events as updated_event
    set
      starts_at = next_starts_at,
      ends_at = next_ends_at,
      status = next_status,
      cancelled_reason = case when p_decision = 'cancel' then trim(p_reason) else null end,
      schedule_version = coalesce(schedule_version, 0) + 1
    where id = event_row.id
    returning to_jsonb(updated_event) into applied_event;

    insert into public.event_change_logs (
      event_id,
      organization_id,
      team_id,
      actor_user_id,
      change_type,
      before_json,
      after_json,
      reason
    ) values (
      event_row.id,
      event_row.organization_id,
      event_row.team_id,
      p_actor_user_id,
      case when p_decision = 'cancel' then 'cancelled' else 'time_changed' end,
      original_event,
      applied_event,
      trim(p_reason)
    );
  end if;

  select coalesce(array_agg(distinct guardian.parent_user_id), '{}'::uuid[])
  into recipient_ids
  from public.player_guardians guardian
  join public.players player on player.id = guardian.player_id
  where player.team_id = event_row.team_id
    and guardian.status = 'active'
    and guardian.parent_user_id is not null;
  recipient_count := cardinality(recipient_ids);

  if p_decision <> 'monitor' then
    foreach recipient_id in array recipient_ids
    loop
      insert into public.notifications (
        organization_id,
        recipient_user_id,
        team_id,
        event_id,
        notification_type,
        title,
        body,
        channel,
        status
      ) values (
        event_row.organization_id,
        recipient_id,
        event_row.team_id,
        event_row.id,
        case when p_decision = 'cancel' then 'event_cancelled' else 'schedule_changed' end,
        case
          when p_decision = 'cancel' then event_row.title || ' cancelled'
          when p_decision = 'delay' then event_row.title || ' delayed'
          else event_row.title || ' confirmed on time'
        end,
        case
          when p_decision = 'cancel' then event_row.title || ' is cancelled. ' || trim(p_reason)
          when p_decision = 'delay' then event_row.title || ' now starts at ' || to_char(next_starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC. ' || trim(p_reason)
          else event_row.title || ' remains on time. ' || trim(p_reason)
        end,
        'email',
        'pending'
      );
      notification_count := notification_count + 1;
    end loop;
  end if;

  insert into public.game_day_resolution_reviews (
    organization_id,
    season_id,
    team_id,
    event_id,
    weather_alert_id,
    actor_user_id,
    decision,
    reason,
    evidence_json,
    original_event_json,
    applied_event_json,
    affected_recipient_count,
    notification_count,
    applied_at,
    idempotency_key
  ) values (
    event_row.organization_id,
    event_row.season_id,
    event_row.team_id,
    event_row.id,
    weather_row.id,
    p_actor_user_id,
    p_decision,
    trim(p_reason),
    jsonb_build_object(
      'weatherAlertId', weather_row.id,
      'weatherHeadline', weather_row.headline,
      'weatherSeverity', weather_row.severity,
      'weatherStatus', weather_row.status,
      'weatherProvider', weather_row.provider,
      'weatherProviderPayloadPresent', weather_row.provider_payload is not null,
      'recipientCount', recipient_count
    ),
    original_event,
    applied_event,
    recipient_count,
    notification_count,
    case when p_decision in ('delay', 'cancel') then now_value else null end,
    p_idempotency_key
  )
  returning * into review_row;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    event_row.organization_id,
    p_actor_user_id,
    'game_day_resolution_reviewed',
    'game_day_resolution_review',
    review_row.id::text,
    format('Game-day decision %s reviewed for event %s with %s pending notification draft(s) and zero provider sends.', p_decision, event_row.id, notification_count)
  );

  return jsonb_build_object(
    'ok', true,
    'message', format('Game-day decision saved with %s pending notification draft(s). No provider send occurred.', notification_count),
    'reviewId', review_row.id,
    'decision', p_decision,
    'affectedRecipientCount', recipient_count,
    'notificationCount', notification_count,
    'event', applied_event
  );
end;
$$;

revoke all on function public.apply_game_day_resolution(uuid, uuid, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.apply_game_day_resolution(uuid, uuid, text, text, timestamptz, text) to service_role;

create or replace function public.acknowledge_notification_receipt(
  p_notification_id uuid,
  p_recipient_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_row public.notifications%rowtype;
  attempt_row public.notification_delivery_attempts%rowtype;
  now_value timestamptz := now();
begin
  select *
  into notification_row
  from public.notifications
  where id = p_notification_id
    and recipient_user_id = p_recipient_user_id
  for update;
  if notification_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'message', 'Notification is not available to this recipient.');
  end if;

  select *
  into attempt_row
  from public.notification_delivery_attempts
  where notification_id = notification_row.id
  order by attempted_at desc
  limit 1
  for update;
  if attempt_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'attempt_required', 'message', 'Acknowledgment is unavailable until a delivery-attempt record exists.');
  end if;
  if attempt_row.acknowledged_at is not null then
    return jsonb_build_object(
      'ok', true,
      'idempotentReplay', true,
      'message', 'Notification was already acknowledged.',
      'acknowledgedAt', attempt_row.acknowledged_at
    );
  end if;

  update public.notification_delivery_attempts
  set acknowledged_at = now_value
  where id = attempt_row.id;

  update public.notifications
  set
    status = 'read',
    read_at = coalesce(read_at, now_value)
  where id = notification_row.id;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    notification_row.organization_id,
    p_recipient_user_id,
    'notification_acknowledged',
    'notification',
    notification_row.id::text,
    'Recipient acknowledged the in-app notification. Provider delivery evidence remains separate.'
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Notification acknowledged. Provider acceptance, delivery, read, and acknowledgment remain separate evidence.',
    'acknowledgedAt', now_value
  );
end;
$$;

revoke all on function public.acknowledge_notification_receipt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.acknowledge_notification_receipt(uuid, uuid) to service_role;
