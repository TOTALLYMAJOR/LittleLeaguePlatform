-- Time-bound, least-privilege temporary caregiver authorization.
-- This is not guardian membership, custody authority, medical-decision authority,
-- attendance truth, schedule authority, team-wide access, or onward delegation.
-- Guardian authorization and exact-email caregiver acceptance are both required.
-- Links are issued for manual sharing; no provider message is created or sent.

create table if not exists public.temporary_caregiver_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  authorized_by_user_id uuid not null references public.profiles(id) on delete restrict,
  caregiver_email text not null check (
    char_length(caregiver_email) between 3 and 254
    and position('@' in caregiver_email) > 1
  ),
  caregiver_user_id uuid references public.profiles(id) on delete set null,
  allowed_actions text[] not null
    check (
      allowed_actions <@ array['view_selected_event_passports', 'pickup_selected_events']::text[]
      and allowed_actions @> array['view_selected_event_passports']::text[]
    ),
  prohibited_actions text[] not null default array[
    'medical_or_health_access',
    'custody_authority',
    'attendance_or_rsvp_changes',
    'official_schedule_changes',
    'team_communication_publishing',
    'roster_or_other_child_access',
    'onward_delegation'
  ]::text[]
    check (prohibited_actions = array[
      'medical_or_health_access',
      'custody_authority',
      'attendance_or_rsvp_changes',
      'official_schedule_changes',
      'team_communication_publishing',
      'roster_or_other_child_access',
      'onward_delegation'
    ]::text[]),
  policy_version text not null default 'temporary-care-v1'
    check (policy_version = 'temporary-care-v1'),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  invite_token_hash text not null unique check (invite_token_hash ~ '^[0-9a-f]{64}$'),
  invite_expires_at timestamptz not null,
  guardian_authorized_at timestamptz not null default now(),
  caregiver_accepted_at timestamptz,
  activated_at timestamptz,
  revoked_at timestamptz,
  revoked_by_user_id uuid references public.profiles(id) on delete set null,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > starts_at and expires_at <= starts_at + interval '14 days'),
  check (invite_expires_at <= expires_at),
  check ((caregiver_accepted_at is null) = (caregiver_user_id is null)),
  check ((activated_at is null) = (caregiver_accepted_at is null)),
  check ((revoked_at is null) = (revoked_by_user_id is null)),
  check (revocation_reason is null or char_length(revocation_reason) between 10 and 500)
);

create table if not exists public.temporary_caregiver_authorization_events (
  authorization_id uuid not null references public.temporary_caregiver_authorizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  authorized_schedule_version integer not null check (authorized_schedule_version > 0),
  created_at timestamptz not null default now(),
  primary key (authorization_id, event_id)
);

create index if not exists idx_temporary_caregiver_authorizations_guardian
  on public.temporary_caregiver_authorizations(authorized_by_user_id, created_at desc);
create index if not exists idx_temporary_caregiver_authorizations_caregiver
  on public.temporary_caregiver_authorizations(caregiver_user_id, starts_at, expires_at);
create index if not exists idx_temporary_caregiver_authorizations_scope
  on public.temporary_caregiver_authorizations(player_id, starts_at, expires_at);
create index if not exists idx_temporary_caregiver_authorization_events_event
  on public.temporary_caregiver_authorization_events(event_id);

drop trigger if exists touch_temporary_caregiver_authorizations_updated_at
  on public.temporary_caregiver_authorizations;
create trigger touch_temporary_caregiver_authorizations_updated_at
  before update on public.temporary_caregiver_authorizations
  for each row execute function public.touch_updated_at();

alter table public.temporary_caregiver_authorizations enable row level security;
alter table public.temporary_caregiver_authorization_events enable row level security;
revoke all on table public.temporary_caregiver_authorizations from public, anon, authenticated;
revoke all on table public.temporary_caregiver_authorization_events from public, anon, authenticated;
grant all on table public.temporary_caregiver_authorizations to service_role;
grant all on table public.temporary_caregiver_authorization_events to service_role;

create or replace function public.create_temporary_caregiver_authorization(
  target_player_id uuid,
  authorizing_user_id uuid,
  target_caregiver_email text,
  target_event_ids uuid[],
  allow_pickup boolean,
  target_starts_at timestamptz,
  target_expires_at timestamptz,
  target_invite_token_hash text,
  target_invite_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(target_caregiver_email));
  actor_email text;
  scope_row record;
  event_count integer;
  new_authorization_id uuid;
  allowed_actions text[] := array['view_selected_event_passports']::text[];
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid caregiver email address.';
  end if;
  if target_event_ids is null or cardinality(target_event_ids) < 1 or cardinality(target_event_ids) > 10 then
    raise exception 'Choose 1 to 10 events for temporary care.';
  end if;
  if target_starts_at < now() - interval '5 minutes'
    or target_expires_at <= target_starts_at
    or target_expires_at > target_starts_at + interval '14 days' then
    raise exception 'Temporary care must use a future window of no more than 14 days.';
  end if;
  if target_invite_expires_at <= now()
    or target_invite_expires_at > least(target_expires_at, now() + interval '7 days') then
    raise exception 'Caregiver invitation expiration must be within 7 days and before care expires.';
  end if;
  if target_invite_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Secure caregiver invitation proof is invalid.';
  end if;

  select lower(email) into actor_email
  from public.profiles
  where id = authorizing_user_id;
  if actor_email is null then raise exception 'Guardian identity is unavailable.'; end if;
  if actor_email = normalized_email then
    raise exception 'Choose another adult for temporary care.';
  end if;

  select player.organization_id, player.team_id, season.status as season_status
  into scope_row
  from public.players player
  join public.teams team on team.id = player.team_id
  join public.seasons season on season.id = team.season_id
  where player.id = target_player_id
    and player.organization_id = team.organization_id
    and exists (
      select 1
      from public.player_guardians guardian
      where guardian.player_id = player.id
        and guardian.parent_user_id = authorizing_user_id
        and guardian.status = 'active'
    );
  if not found or scope_row.season_status <> 'active' then
    raise exception 'An active guardian link in the current season is required.';
  end if;

  select count(distinct event.id) into event_count
  from public.events event
  where event.id = any(target_event_ids)
    and event.organization_id = scope_row.organization_id
    and event.team_id = scope_row.team_id
    and event.status = 'scheduled'
    and event.starts_at >= target_starts_at
    and event.ends_at <= target_expires_at;
  if event_count <> cardinality(target_event_ids) then
    raise exception 'Every selected event must be scheduled for this child team inside the care window.';
  end if;

  if allow_pickup and public.transportation_pickup_restriction_exists(
    target_player_id,
    authorizing_user_id
  ) then
    raise exception 'Pickup permission needs league review because a restriction is recorded.';
  end if;
  if allow_pickup then
    allowed_actions := array_append(allowed_actions, 'pickup_selected_events');
  end if;

  if exists (
    select 1
    from public.temporary_caregiver_authorizations caregiver_authorization
    where caregiver_authorization.player_id = target_player_id
      and caregiver_authorization.caregiver_email = normalized_email
      and caregiver_authorization.revoked_at is null
      and caregiver_authorization.expires_at > now()
      and tstzrange(caregiver_authorization.starts_at, caregiver_authorization.expires_at, '[)')
        && tstzrange(target_starts_at, target_expires_at, '[)')
  ) then
    raise exception 'This caregiver already has current access for the child during that time.';
  end if;

  insert into public.temporary_caregiver_authorizations (
    organization_id,
    team_id,
    player_id,
    authorized_by_user_id,
    caregiver_email,
    allowed_actions,
    starts_at,
    expires_at,
    invite_token_hash,
    invite_expires_at
  )
  values (
    scope_row.organization_id,
    scope_row.team_id,
    target_player_id,
    authorizing_user_id,
    normalized_email,
    allowed_actions,
    target_starts_at,
    target_expires_at,
    target_invite_token_hash,
    target_invite_expires_at
  )
  returning id into new_authorization_id;

  insert into public.temporary_caregiver_authorization_events (
    authorization_id,
    event_id,
    authorized_schedule_version
  )
  select new_authorization_id, event.id, coalesce(event.schedule_version, 1)
  from public.events event
  where event.id = any(target_event_ids);

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    scope_row.organization_id,
    authorizing_user_id,
    'temporary_caregiver_authorized',
    'temporary_caregiver_authorization',
    new_authorization_id::text,
    'A guardian reviewed and authorized one child, selected events, a bounded time window, and minimum caregiver actions. Access remains inactive until exact-email caregiver acceptance. No provider message was sent.'
  );

  return jsonb_build_object(
    'authorization_id', new_authorization_id,
    'state', 'awaiting_caregiver_acceptance',
    'invite_expires_at', target_invite_expires_at,
    'expires_at', target_expires_at
  );
end;
$$;

create or replace function public.accept_temporary_caregiver_authorization(
  target_invite_token_hash text,
  accepting_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  authorization_row public.temporary_caregiver_authorizations%rowtype;
  accepting_email text;
begin
  select * into authorization_row
  from public.temporary_caregiver_authorizations
  where invite_token_hash = target_invite_token_hash
  for update;
  if not found then raise exception 'Caregiver invitation is unavailable.'; end if;
  if authorization_row.revoked_at is not null then
    raise exception 'Temporary caregiver access was ended.';
  end if;
  if authorization_row.caregiver_accepted_at is not null then
    raise exception 'Temporary caregiver access was already accepted.';
  end if;
  if authorization_row.invite_expires_at <= now() or authorization_row.expires_at <= now() then
    raise exception 'Caregiver invitation expired.';
  end if;

  select lower(email) into accepting_email
  from public.profiles
  where id = accepting_user_id;
  if accepting_email is null then raise exception 'Signed-in caregiver identity is unavailable.'; end if;
  if accepting_email <> authorization_row.caregiver_email then
    raise exception 'Sign in with the exact caregiver email named by the guardian.';
  end if;
  if 'pickup_selected_events' = any(authorization_row.allowed_actions)
    and public.transportation_pickup_restriction_exists(
      authorization_row.player_id,
      authorization_row.authorized_by_user_id
    ) then
    raise exception 'Pickup permission needs league review because a restriction is recorded.';
  end if;
  if not exists (
    select 1
    from public.player_guardians guardian
    where guardian.player_id = authorization_row.player_id
      and guardian.parent_user_id = authorization_row.authorized_by_user_id
      and guardian.status = 'active'
  ) then
    raise exception 'The guardian who set up this access is no longer linked to the child.';
  end if;

  update public.temporary_caregiver_authorizations
  set caregiver_user_id = accepting_user_id,
      caregiver_accepted_at = now(),
      activated_at = greatest(now(), authorization_row.starts_at),
      invite_token_hash = encode(digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex')
  where id = authorization_row.id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    authorization_row.organization_id,
    accepting_user_id,
    'temporary_caregiver_accepted',
    'temporary_caregiver_authorization',
    authorization_row.id::text,
    'The exact-email caregiver accepted the reviewed child, selected-event, time-window, and minimum-action scope. Access becomes active at the authorized start and ends at expiry or revocation.'
  );

  return jsonb_build_object(
    'authorization_id', authorization_row.id,
    'state', case when authorization_row.starts_at > now() then 'accepted_upcoming' else 'active' end,
    'starts_at', authorization_row.starts_at,
    'expires_at', authorization_row.expires_at
  );
end;
$$;

create or replace function public.revoke_temporary_caregiver_authorization(
  target_authorization_id uuid,
  revoking_user_id uuid,
  revocation_explanation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  authorization_row public.temporary_caregiver_authorizations%rowtype;
begin
  if char_length(trim(revocation_explanation)) < 10 or char_length(trim(revocation_explanation)) > 500 then
    raise exception 'Revocation reason must be 10 to 500 characters.';
  end if;
  select * into authorization_row
  from public.temporary_caregiver_authorizations
  where id = target_authorization_id
  for update;
  if not found then raise exception 'Temporary caregiver access is unavailable.'; end if;
  if authorization_row.revoked_at is not null then
    raise exception 'Temporary caregiver access was already ended.';
  end if;
  if authorization_row.authorized_by_user_id <> revoking_user_id
    and not exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = authorization_row.organization_id
        and membership.user_id = revoking_user_id
        and membership.role = 'admin'
        and membership.status = 'active'
    ) then
    raise exception 'Only the guardian who set up this access or an active league administrator can end temporary care.';
  end if;

  update public.temporary_caregiver_authorizations
  set revoked_at = now(),
      revoked_by_user_id = revoking_user_id,
      revocation_reason = trim(revocation_explanation),
      invite_token_hash = encode(digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex')
  where id = authorization_row.id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    authorization_row.organization_id,
    revoking_user_id,
    'temporary_caregiver_revoked',
    'temporary_caregiver_authorization',
    authorization_row.id::text,
    'An authorized adult revoked temporary caregiver access with an attributed reason. The caregiver loses selected-event access at next server contact; no provider message was sent.'
  );

  return jsonb_build_object(
    'authorization_id', authorization_row.id,
    'state', 'revoked',
    'cache_action', 'clear_at_next_contact'
  );
end;
$$;

revoke all on function public.create_temporary_caregiver_authorization(
  uuid, uuid, text, uuid[], boolean, timestamptz, timestamptz, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.accept_temporary_caregiver_authorization(text, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_temporary_caregiver_authorization(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.create_temporary_caregiver_authorization(
  uuid, uuid, text, uuid[], boolean, timestamptz, timestamptz, text, timestamptz
) to service_role;
grant execute on function public.accept_temporary_caregiver_authorization(text, uuid)
  to service_role;
grant execute on function public.revoke_temporary_caregiver_authorization(uuid, uuid, text)
  to service_role;
