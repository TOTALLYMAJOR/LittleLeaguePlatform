-- Guardian-owned event transportation with explicit, version-aware dual acceptance.
-- A request is not an assignment. A driver's offer records the driver's acceptance;
-- the requesting guardian must separately accept before responsibility is assigned.
-- Recorded pickup restrictions fail closed. No provider message is created or sent.

create table if not exists public.transportation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  requested_by_user_id uuid not null references public.profiles(id) on delete restrict,
  direction text not null check (direction in ('outbound', 'return')),
  schedule_version integer not null check (schedule_version > 0),
  status text not null default 'open' check (status in ('open', 'matched', 'withdrawn')),
  requested_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  withdrawn_by_user_id uuid references public.profiles(id) on delete set null,
  withdrawal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((withdrawn_at is null) = (withdrawn_by_user_id is null)),
  check (withdrawal_reason is null or char_length(withdrawal_reason) between 10 and 500)
);

create unique index if not exists idx_transportation_requests_one_current
  on public.transportation_requests(event_id, player_id, direction)
  where status in ('open', 'matched');
create index if not exists idx_transportation_requests_team_event
  on public.transportation_requests(team_id, event_id, requested_at desc);
create index if not exists idx_transportation_requests_guardian
  on public.transportation_requests(requested_by_user_id, requested_at desc);

create table if not exists public.transportation_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.transportation_requests(id) on delete cascade,
  offered_by_user_id uuid not null references public.profiles(id) on delete restrict,
  seats integer not null check (seats between 1 and 8),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'withdrawn')),
  offered_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, offered_by_user_id),
  check ((status = 'withdrawn') = (withdrawn_at is not null))
);

create index if not exists idx_transportation_offers_request
  on public.transportation_offers(request_id, offered_at);

create table if not exists public.transportation_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  request_id uuid not null references public.transportation_requests(id) on delete cascade,
  offer_id uuid not null references public.transportation_offers(id) on delete cascade,
  requested_by_user_id uuid not null references public.profiles(id) on delete restrict,
  driver_user_id uuid not null references public.profiles(id) on delete restrict,
  direction text not null check (direction in ('outbound', 'return')),
  seats integer not null check (seats between 1 and 8),
  schedule_version integer not null check (schedule_version > 0),
  status text not null default 'awaiting_requester_acceptance'
    check (status in ('awaiting_requester_acceptance', 'assigned', 'withdrawn')),
  driver_accepted_at timestamptz not null,
  requester_accepted_at timestamptz,
  assigned_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_by_user_id uuid references public.profiles(id) on delete set null,
  withdrawal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (driver_user_id <> requested_by_user_id),
  check (status <> 'assigned' or (requester_accepted_at is not null and assigned_at is not null)),
  check (status <> 'withdrawn' or (withdrawn_at is not null and withdrawn_by_user_id is not null)),
  check (withdrawal_reason is null or char_length(withdrawal_reason) between 10 and 500)
);

create unique index if not exists idx_transportation_assignments_one_assigned
  on public.transportation_assignments(request_id)
  where status = 'assigned';
create index if not exists idx_transportation_assignments_event_player
  on public.transportation_assignments(event_id, player_id, direction);
create index if not exists idx_transportation_assignments_driver
  on public.transportation_assignments(driver_user_id, created_at desc);

drop trigger if exists touch_transportation_requests_updated_at on public.transportation_requests;
create trigger touch_transportation_requests_updated_at
  before update on public.transportation_requests
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_transportation_offers_updated_at on public.transportation_offers;
create trigger touch_transportation_offers_updated_at
  before update on public.transportation_offers
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_transportation_assignments_updated_at on public.transportation_assignments;
create trigger touch_transportation_assignments_updated_at
  before update on public.transportation_assignments
  for each row execute function public.touch_updated_at();

alter table public.transportation_requests enable row level security;
alter table public.transportation_offers enable row level security;
alter table public.transportation_assignments enable row level security;
revoke all on table public.transportation_requests from public, anon, authenticated;
revoke all on table public.transportation_offers from public, anon, authenticated;
revoke all on table public.transportation_assignments from public, anon, authenticated;
grant all on table public.transportation_requests to service_role;
grant all on table public.transportation_offers to service_role;
grant all on table public.transportation_assignments to service_role;

create or replace function public.transportation_pickup_restriction_exists(
  target_player_id uuid,
  target_user_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guardian_authorizations guardian_authorization
    join public.player_guardians guardian on guardian.id = guardian_authorization.player_guardian_id
    where guardian_authorization.authorization_type = 'pickup'
      and guardian_authorization.allowed = false
      and guardian_authorization.effective_at <= now()
      and (guardian_authorization.expires_at is null or guardian_authorization.expires_at > now())
      and guardian.status = 'active'
      and (
        guardian_authorization.player_id = target_player_id
        or (target_user_id is not null and guardian.parent_user_id = target_user_id)
      )
  );
$$;

create or replace function public.request_event_transportation(
  target_event_id uuid,
  target_player_id uuid,
  requesting_user_id uuid,
  target_direction text,
  expected_schedule_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  scope_row record;
  request_id uuid;
begin
  if target_direction not in ('outbound', 'return') then
    raise exception 'Choose outbound or return transportation.';
  end if;

  select event.id as event_id,
         event.organization_id,
         event.team_id,
         event.status as event_status,
         event.starts_at,
         coalesce(event.schedule_version, 1) as schedule_version,
         player.id as player_id,
         season.status as season_status
  into scope_row
  from public.events event
  join public.players player
    on player.id = target_player_id
   and player.team_id = event.team_id
   and player.organization_id = event.organization_id
  join public.seasons season on season.id = event.season_id
  where event.id = target_event_id
  for update of event;

  if not found then raise exception 'The child and event scope could not be verified.'; end if;
  if scope_row.season_status <> 'active' or scope_row.event_status <> 'scheduled' or scope_row.starts_at <= now() then
    raise exception 'Transportation can be requested only for an upcoming scheduled event in the active season.';
  end if;
  if scope_row.schedule_version <> expected_schedule_version then
    raise exception 'The official event changed. Review the current schedule before requesting transportation.';
  end if;
  if not exists (
    select 1
    from public.player_guardians guardian
    where guardian.player_id = target_player_id
      and guardian.parent_user_id = requesting_user_id
      and guardian.status = 'active'
  ) then
    raise exception 'An active guardian link for this child is required.';
  end if;
  if public.transportation_pickup_restriction_exists(target_player_id, requesting_user_id) then
    raise exception 'Transportation needs league review because a pickup restriction is recorded.';
  end if;
  if exists (
    select 1 from public.transportation_requests request
    where request.event_id = target_event_id
      and request.player_id = target_player_id
      and request.direction = target_direction
      and request.status in ('open', 'matched')
  ) then
    raise exception 'A current transportation request already exists for this child, event, and direction.';
  end if;

  insert into public.transportation_requests (
    organization_id, team_id, event_id, player_id, requested_by_user_id,
    direction, schedule_version
  )
  values (
    scope_row.organization_id, scope_row.team_id, scope_row.event_id, scope_row.player_id,
    requesting_user_id, target_direction, scope_row.schedule_version
  )
  returning id into request_id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    scope_row.organization_id,
    requesting_user_id,
    'transportation_requested',
    'transportation_request',
    request_id::text,
    'A guardian requested one direction of event transportation. Responsibility remains unassigned and no provider message was sent.'
  );

  return jsonb_build_object(
    'request_id', request_id,
    'state', 'open',
    'schedule_version', scope_row.schedule_version
  );
end;
$$;

create or replace function public.offer_event_transportation(
  target_request_id uuid,
  offering_user_id uuid,
  seat_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.transportation_requests%rowtype;
  event_row record;
  offer_id uuid;
  assignment_id uuid;
begin
  if seat_count < 1 or seat_count > 8 then
    raise exception 'Seat count must be between 1 and 8.';
  end if;

  select * into request_row
  from public.transportation_requests
  where id = target_request_id
  for update;
  if not found then raise exception 'Transportation request is unavailable.'; end if;
  if request_row.status <> 'open' then raise exception 'This transportation request is no longer open.'; end if;
  if request_row.requested_by_user_id = offering_user_id then
    raise exception 'The requesting guardian cannot offer the same assignment.';
  end if;

  select status, starts_at, coalesce(schedule_version, 1) as schedule_version
  into event_row
  from public.events
  where id = request_row.event_id
  for update;
  if not found or event_row.status <> 'scheduled' or event_row.starts_at <= now() then
    raise exception 'Transportation offers require an upcoming scheduled event.';
  end if;
  if event_row.schedule_version <> request_row.schedule_version then
    raise exception 'The official event changed. The requesting guardian must review and request again.';
  end if;
  if not exists (
    select 1
    from public.player_guardians guardian
    join public.players player on player.id = guardian.player_id
    where guardian.parent_user_id = offering_user_id
      and guardian.status = 'active'
      and player.team_id = request_row.team_id
      and player.organization_id = request_row.organization_id
  ) then
    raise exception 'Only an active guardian on this team can offer transportation.';
  end if;
  if public.transportation_pickup_restriction_exists(request_row.player_id, offering_user_id) then
    raise exception 'Transportation needs league review because a pickup restriction is recorded.';
  end if;

  insert into public.transportation_offers (
    request_id, offered_by_user_id, seats
  )
  values (
    request_row.id, offering_user_id, seat_count
  )
  returning id into offer_id;

  insert into public.transportation_assignments (
    organization_id, team_id, event_id, player_id, request_id, offer_id,
    requested_by_user_id, driver_user_id, direction, seats, schedule_version,
    driver_accepted_at
  )
  values (
    request_row.organization_id, request_row.team_id, request_row.event_id,
    request_row.player_id, request_row.id, offer_id, request_row.requested_by_user_id,
    offering_user_id, request_row.direction, seat_count, request_row.schedule_version, now()
  )
  returning id into assignment_id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    request_row.organization_id,
    offering_user_id,
    'transportation_offered',
    'transportation_assignment',
    assignment_id::text,
    'A team guardian offered seats and accepted the driver side of one direction. Responsibility remains unassigned until the requesting guardian accepts. No provider message was sent.'
  );

  return jsonb_build_object(
    'request_id', request_row.id,
    'offer_id', offer_id,
    'assignment_id', assignment_id,
    'state', 'awaiting_requester_acceptance',
    'schedule_version', request_row.schedule_version
  );
exception
  when unique_violation then
    raise exception 'This guardian already has a current offer for the request.';
end;
$$;

create or replace function public.accept_transportation_assignment(
  target_assignment_id uuid,
  accepting_user_id uuid,
  expected_schedule_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_row public.transportation_assignments%rowtype;
  event_row record;
begin
  select * into assignment_row
  from public.transportation_assignments
  where id = target_assignment_id
  for update;
  if not found then raise exception 'Transportation assignment is unavailable.'; end if;
  if assignment_row.status <> 'awaiting_requester_acceptance' then
    raise exception 'This transportation assignment is no longer awaiting acceptance.';
  end if;
  if assignment_row.requested_by_user_id <> accepting_user_id then
    raise exception 'Only the requesting guardian can accept this offer.';
  end if;

  select status, starts_at, coalesce(schedule_version, 1) as schedule_version
  into event_row
  from public.events
  where id = assignment_row.event_id
  for update;
  if not found or event_row.status <> 'scheduled' or event_row.starts_at <= now() then
    raise exception 'Transportation can be assigned only for an upcoming scheduled event.';
  end if;
  if event_row.schedule_version <> assignment_row.schedule_version
    or event_row.schedule_version <> expected_schedule_version then
    raise exception 'The official event changed. Review the current schedule before accepting transportation.';
  end if;
  if not exists (
    select 1 from public.player_guardians guardian
    where guardian.player_id = assignment_row.player_id
      and guardian.parent_user_id = accepting_user_id
      and guardian.status = 'active'
  ) then
    raise exception 'The requesting guardian link is no longer active.';
  end if;
  if not exists (
    select 1
    from public.player_guardians guardian
    join public.players player on player.id = guardian.player_id
    where guardian.parent_user_id = assignment_row.driver_user_id
      and guardian.status = 'active'
      and player.team_id = assignment_row.team_id
      and player.organization_id = assignment_row.organization_id
  ) then
    raise exception 'The offering guardian is no longer active on this team.';
  end if;
  if public.transportation_pickup_restriction_exists(
    assignment_row.player_id,
    assignment_row.driver_user_id
  ) then
    raise exception 'Transportation needs league review because a pickup restriction is recorded.';
  end if;

  update public.transportation_assignments
  set status = 'assigned',
      requester_accepted_at = now(),
      assigned_at = now()
  where id = assignment_row.id;

  update public.transportation_requests
  set status = 'matched'
  where id = assignment_row.request_id;

  update public.transportation_offers
  set status = case when id = assignment_row.offer_id then 'accepted' else 'withdrawn' end,
      withdrawn_at = case when id = assignment_row.offer_id then null else now() end
  where request_id = assignment_row.request_id
    and status = 'pending';

  update public.transportation_assignments
  set status = 'withdrawn',
      withdrawn_at = now(),
      withdrawn_by_user_id = accepting_user_id,
      withdrawal_reason = 'Another mutually accepted offer was selected.'
  where request_id = assignment_row.request_id
    and id <> assignment_row.id
    and status = 'awaiting_requester_acceptance';

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    assignment_row.organization_id,
    accepting_user_id,
    'transportation_assignment_accepted',
    'transportation_assignment',
    assignment_row.id::text,
    'The requesting guardian accepted the driver offer for one direction at the current schedule version. Both adults have accepted; responsibility is now assigned. No provider message was sent.'
  );

  return jsonb_build_object(
    'assignment_id', assignment_row.id,
    'state', 'assigned',
    'schedule_version', assignment_row.schedule_version
  );
end;
$$;

create or replace function public.withdraw_transportation_request(
  target_request_id uuid,
  withdrawing_user_id uuid,
  withdrawal_explanation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.transportation_requests%rowtype;
begin
  if char_length(trim(withdrawal_explanation)) < 10 or char_length(trim(withdrawal_explanation)) > 500 then
    raise exception 'Withdrawal reason must be 10 to 500 characters.';
  end if;
  select * into request_row
  from public.transportation_requests
  where id = target_request_id
  for update;
  if not found then raise exception 'Transportation request is unavailable.'; end if;
  if request_row.requested_by_user_id <> withdrawing_user_id then
    raise exception 'Only the requesting guardian can withdraw this request.';
  end if;
  if request_row.status <> 'open' then
    raise exception 'Only an open transportation request can be withdrawn.';
  end if;

  update public.transportation_requests
  set status = 'withdrawn',
      withdrawn_at = now(),
      withdrawn_by_user_id = withdrawing_user_id,
      withdrawal_reason = trim(withdrawal_explanation)
  where id = request_row.id;
  update public.transportation_offers
  set status = 'withdrawn', withdrawn_at = now()
  where request_id = request_row.id and status = 'pending';
  update public.transportation_assignments
  set status = 'withdrawn',
      withdrawn_at = now(),
      withdrawn_by_user_id = withdrawing_user_id,
      withdrawal_reason = trim(withdrawal_explanation)
  where request_id = request_row.id and status = 'awaiting_requester_acceptance';

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    request_row.organization_id,
    withdrawing_user_id,
    'transportation_request_withdrawn',
    'transportation_request',
    request_row.id::text,
    'The requesting guardian withdrew one direction before responsibility was assigned. The reason and actor were recorded; no provider message was sent.'
  );

  return jsonb_build_object('request_id', request_row.id, 'state', 'withdrawn');
end;
$$;

create or replace function public.withdraw_transportation_assignment(
  target_assignment_id uuid,
  withdrawing_user_id uuid,
  withdrawal_explanation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_row public.transportation_assignments%rowtype;
  event_row record;
begin
  if char_length(trim(withdrawal_explanation)) < 10 or char_length(trim(withdrawal_explanation)) > 500 then
    raise exception 'Withdrawal reason must be 10 to 500 characters.';
  end if;
  select * into assignment_row
  from public.transportation_assignments
  where id = target_assignment_id
  for update;
  if not found then raise exception 'Transportation assignment is unavailable.'; end if;
  if withdrawing_user_id not in (assignment_row.requested_by_user_id, assignment_row.driver_user_id) then
    raise exception 'Only an adult on this assignment can withdraw it.';
  end if;
  if assignment_row.status not in ('awaiting_requester_acceptance', 'assigned') then
    raise exception 'This transportation assignment is no longer current.';
  end if;

  update public.transportation_assignments
  set status = 'withdrawn',
      withdrawn_at = now(),
      withdrawn_by_user_id = withdrawing_user_id,
      withdrawal_reason = trim(withdrawal_explanation)
  where id = assignment_row.id;
  update public.transportation_offers
  set status = 'withdrawn', withdrawn_at = now()
  where id = assignment_row.offer_id;

  select status, starts_at, coalesce(schedule_version, 1) as schedule_version
  into event_row
  from public.events
  where id = assignment_row.event_id;
  if found
    and event_row.status = 'scheduled'
    and event_row.starts_at > now()
    and event_row.schedule_version = assignment_row.schedule_version then
    update public.transportation_requests
    set status = 'open'
    where id = assignment_row.request_id;
  else
    update public.transportation_requests
    set status = 'withdrawn',
        withdrawn_at = now(),
        withdrawn_by_user_id = withdrawing_user_id,
        withdrawal_reason = trim(withdrawal_explanation)
    where id = assignment_row.request_id;
  end if;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    assignment_row.organization_id,
    withdrawing_user_id,
    'transportation_assignment_withdrawn',
    'transportation_assignment',
    assignment_row.id::text,
    'An adult withdrew a current transportation assignment. Responsibility returned to unassigned unless a new mutually accepted assignment is created. No provider message was sent.'
  );

  return jsonb_build_object('assignment_id', assignment_row.id, 'state', 'withdrawn');
end;
$$;

revoke all on function public.transportation_pickup_restriction_exists(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.request_event_transportation(uuid, uuid, uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.offer_event_transportation(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.accept_transportation_assignment(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.withdraw_transportation_request(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.withdraw_transportation_assignment(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.transportation_pickup_restriction_exists(uuid, uuid)
  to service_role;
grant execute on function public.request_event_transportation(uuid, uuid, uuid, text, integer)
  to service_role;
grant execute on function public.offer_event_transportation(uuid, uuid, integer)
  to service_role;
grant execute on function public.accept_transportation_assignment(uuid, uuid, integer)
  to service_role;
grant execute on function public.withdraw_transportation_request(uuid, uuid, text)
  to service_role;
grant execute on function public.withdraw_transportation_assignment(uuid, uuid, text)
  to service_role;
