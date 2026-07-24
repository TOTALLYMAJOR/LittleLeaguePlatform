-- Additional guardian proposals and human-reviewed invitation issuance.
-- Parents may propose one adult for one linked child. Only an active
-- organization admin may approve the scope and issue a one-time manual link.
-- No provider message is created or sent by these functions.

create table if not exists public.additional_guardian_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  proposed_by_user_id uuid not null references public.profiles(id) on delete restrict,
  proposed_email text not null check (
    char_length(proposed_email) between 3 and 254
    and position('@' in proposed_email) > 1
  ),
  relationship text not null check (relationship in ('mother', 'father', 'guardian', 'other')),
  requested_scope text[] not null default array['standard_linked_guardian_access']::text[]
    check (requested_scope = array['standard_linked_guardian_access']::text[]),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  revoked_at timestamptz,
  revoked_by_user_id uuid references public.profiles(id) on delete set null,
  decision_reason text,
  revocation_reason text,
  parent_invite_id uuid references public.parent_invites(id) on delete set null,
  manual_link_issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(approved_at, rejected_at, cancelled_at) <= 1),
  check ((reviewed_at is null) = (reviewed_by_user_id is null)),
  check (approved_at is null or (reviewed_at is not null and parent_invite_id is not null)),
  check (rejected_at is null or reviewed_at is not null),
  check (revoked_at is null or approved_at is not null)
);

create index if not exists idx_additional_guardian_requests_parent
  on public.additional_guardian_requests(proposed_by_user_id, requested_at desc);
create index if not exists idx_additional_guardian_requests_review
  on public.additional_guardian_requests(organization_id, reviewed_at, requested_at);

drop trigger if exists touch_additional_guardian_requests_updated_at
  on public.additional_guardian_requests;
create trigger touch_additional_guardian_requests_updated_at
  before update on public.additional_guardian_requests
  for each row execute function public.touch_updated_at();

alter table public.additional_guardian_requests enable row level security;
revoke all on table public.additional_guardian_requests from public, anon, authenticated;
grant all on table public.additional_guardian_requests to service_role;

create or replace function public.request_additional_guardian(
  target_player_id uuid,
  proposing_user_id uuid,
  adult_email text,
  adult_relationship text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(adult_email));
  actor_email text;
  player_row record;
  request_id uuid;
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid adult email address.';
  end if;
  if adult_relationship not in ('mother', 'father', 'guardian', 'other') then
    raise exception 'Choose a supported relationship.';
  end if;

  select lower(email) into actor_email
  from public.profiles
  where id = proposing_user_id;
  if actor_email is null then raise exception 'Parent identity is unavailable.'; end if;
  if actor_email = normalized_email then
    raise exception 'Use another adult email address.';
  end if;

  select player.id, player.organization_id, player.team_id
  into player_row
  from public.players player
  join public.teams team on team.id = player.team_id
  join public.seasons season on season.id = team.season_id
  where player.id = target_player_id
    and player.organization_id = team.organization_id
    and season.status = 'active'
    and exists (
      select 1
      from public.player_guardians guardian
      where guardian.player_id = player.id
        and guardian.parent_user_id = proposing_user_id
        and guardian.status = 'active'
    );
  if not found then
    raise exception 'An active guardian link for this child is required.';
  end if;

  if exists (
    select 1
    from public.additional_guardian_requests request
    where request.player_id = target_player_id
      and request.proposed_email = normalized_email
      and request.reviewed_at is null
      and request.cancelled_at is null
  ) then
    raise exception 'This adult already has a request awaiting review for this child.';
  end if;

  insert into public.additional_guardian_requests (
    organization_id,
    team_id,
    player_id,
    proposed_by_user_id,
    proposed_email,
    relationship
  )
  values (
    player_row.organization_id,
    player_row.team_id,
    player_row.id,
    proposing_user_id,
    normalized_email,
    adult_relationship
  )
  returning id into request_id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    player_row.organization_id,
    proposing_user_id,
    'additional_guardian_requested',
    'additional_guardian_request',
    request_id::text,
    'A linked guardian proposed one adult for one child and team. Access remains unchanged pending administrator review.'
  );

  return jsonb_build_object('request_id', request_id, 'state', 'pending_review');
end;
$$;

create or replace function public.cancel_additional_guardian_request(
  target_request_id uuid,
  cancelling_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.additional_guardian_requests%rowtype;
begin
  select * into request_row
  from public.additional_guardian_requests
  where id = target_request_id
  for update;
  if not found then raise exception 'Request is unavailable.'; end if;
  if request_row.proposed_by_user_id <> cancelling_user_id then
    raise exception 'Only the proposing guardian can cancel this request.';
  end if;
  if request_row.reviewed_at is not null or request_row.cancelled_at is not null then
    raise exception 'Only a request awaiting review can be cancelled.';
  end if;

  update public.additional_guardian_requests
  set cancelled_at = now()
  where id = request_row.id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    request_row.organization_id,
    cancelling_user_id,
    'additional_guardian_request_cancelled',
    'additional_guardian_request',
    request_row.id::text,
    'The proposing guardian cancelled the request before administrator review. Access remained unchanged.'
  );

  return jsonb_build_object('request_id', request_row.id, 'state', 'cancelled');
end;
$$;

create or replace function public.reject_additional_guardian_request(
  target_request_id uuid,
  reviewing_user_id uuid,
  review_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.additional_guardian_requests%rowtype;
begin
  if char_length(trim(review_reason)) < 10 or char_length(trim(review_reason)) > 500 then
    raise exception 'Review reason must be 10 to 500 characters.';
  end if;
  select * into request_row
  from public.additional_guardian_requests
  where id = target_request_id
  for update;
  if not found then raise exception 'Request is unavailable.'; end if;
  if request_row.reviewed_at is not null or request_row.cancelled_at is not null then
    raise exception 'This request is no longer awaiting review.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = request_row.organization_id
      and membership.user_id = reviewing_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Active organization administrator access is required.';
  end if;

  update public.additional_guardian_requests
  set reviewed_at = now(),
      reviewed_by_user_id = reviewing_user_id,
      rejected_at = now(),
      decision_reason = trim(review_reason)
  where id = request_row.id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    request_row.organization_id,
    reviewing_user_id,
    'additional_guardian_request_rejected',
    'additional_guardian_request',
    request_row.id::text,
    'An organization administrator rejected the proposed child and team access. No invitation or provider message was created.'
  );

  return jsonb_build_object('request_id', request_row.id, 'state', 'rejected');
end;
$$;

create or replace function public.approve_additional_guardian_request(
  target_request_id uuid,
  reviewing_user_id uuid,
  review_reason text,
  target_invite_token_hash text,
  target_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.additional_guardian_requests%rowtype;
  invite_id uuid;
begin
  if char_length(trim(review_reason)) < 10 or char_length(trim(review_reason)) > 500 then
    raise exception 'Review reason must be 10 to 500 characters.';
  end if;
  if target_invite_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Secure invitation proof is invalid.';
  end if;
  if target_expires_at <= now() or target_expires_at > now() + interval '30 days' then
    raise exception 'Invitation expiration must be within the next 30 days.';
  end if;

  select * into request_row
  from public.additional_guardian_requests
  where id = target_request_id
  for update;
  if not found then raise exception 'Request is unavailable.'; end if;
  if request_row.reviewed_at is not null or request_row.cancelled_at is not null then
    raise exception 'This request is no longer awaiting review.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = request_row.organization_id
      and membership.user_id = reviewing_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Active organization administrator access is required.';
  end if;
  if not exists (
    select 1
    from public.players player
    join public.teams team on team.id = player.team_id
    join public.seasons season on season.id = team.season_id
    where player.id = request_row.player_id
      and player.team_id = request_row.team_id
      and player.organization_id = request_row.organization_id
      and season.status = 'active'
  ) then
    raise exception 'The child and team must remain in an active season.';
  end if;
  if not exists (
    select 1 from public.player_guardians guardian
    where guardian.player_id = request_row.player_id
      and guardian.parent_user_id = request_row.proposed_by_user_id
      and guardian.status = 'active'
  ) then
    raise exception 'The proposing guardian is no longer authorized for this child.';
  end if;
  if exists (
    select 1
    from public.player_guardians guardian
    join public.profiles profile on profile.id = guardian.parent_user_id
    where guardian.player_id = request_row.player_id
      and guardian.status = 'active'
      and lower(profile.email) = request_row.proposed_email
  ) then
    raise exception 'This adult already has active access for this child.';
  end if;
  if exists (
    select 1 from public.parent_invites invite
    where invite.player_id = request_row.player_id
      and lower(invite.email) = request_row.proposed_email
      and invite.status = 'pending'
      and invite.expires_at > now()
  ) then
    raise exception 'This adult already has a pending invitation for this child.';
  end if;

  insert into public.parent_invites (
    organization_id,
    team_id,
    player_id,
    email,
    invite_token_hash,
    status,
    delivery_status,
    expires_at
  )
  values (
    request_row.organization_id,
    request_row.team_id,
    request_row.player_id,
    request_row.proposed_email,
    target_invite_token_hash,
    'pending',
    'queued',
    target_expires_at
  )
  returning id into invite_id;

  insert into public.player_guardians (
    player_id,
    parent_invite_id,
    relationship,
    status
  )
  values (
    request_row.player_id,
    invite_id,
    request_row.relationship,
    'invited'
  );

  update public.additional_guardian_requests
  set reviewed_at = now(),
      reviewed_by_user_id = reviewing_user_id,
      approved_at = now(),
      decision_reason = trim(review_reason),
      parent_invite_id = invite_id,
      manual_link_issued_at = now()
  where id = request_row.id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    request_row.organization_id,
    reviewing_user_id,
    'additional_guardian_request_approved',
    'additional_guardian_request',
    request_row.id::text,
    'An organization administrator approved one child and team scope and issued a one-time manual link. No provider message was sent.'
  );

  return jsonb_build_object(
    'request_id', request_row.id,
    'invite_id', invite_id,
    'state', 'approved',
    'expires_at', target_expires_at
  );
end;
$$;

create or replace function public.revoke_additional_guardian_access(
  target_request_id uuid,
  revoking_user_id uuid,
  revocation_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.additional_guardian_requests%rowtype;
  accepted_user_id uuid;
begin
  if char_length(trim(revocation_reason)) < 10 or char_length(trim(revocation_reason)) > 500 then
    raise exception 'Revocation reason must be 10 to 500 characters.';
  end if;
  select * into request_row
  from public.additional_guardian_requests
  where id = target_request_id
  for update;
  if not found then raise exception 'Request is unavailable.'; end if;
  if request_row.approved_at is null or request_row.revoked_at is not null then
    raise exception 'Only current approved access can be revoked.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = request_row.organization_id
      and membership.user_id = revoking_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Active organization administrator access is required.';
  end if;

  select accepted_by_user_id into accepted_user_id
  from public.parent_invites
  where id = request_row.parent_invite_id;

  update public.parent_invites
  set status = case when status = 'pending' then 'revoked' else status end,
      updated_at = now()
  where id = request_row.parent_invite_id;

  update public.player_guardians
  set status = 'removed',
      updated_at = now()
  where parent_invite_id = request_row.parent_invite_id
    and player_id = request_row.player_id;

  if accepted_user_id is not null and not exists (
    select 1
    from public.player_guardians guardian
    join public.players player on player.id = guardian.player_id
    where guardian.parent_user_id = accepted_user_id
      and guardian.status = 'active'
      and player.team_id = request_row.team_id
  ) then
    update public.team_memberships
    set status = 'removed',
        updated_at = now()
    where team_id = request_row.team_id
      and user_id = accepted_user_id
      and role = 'parent';
  end if;

  update public.additional_guardian_requests
  set revoked_at = now(),
      revoked_by_user_id = revoking_user_id,
      revocation_reason = trim(revocation_reason)
  where id = request_row.id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    request_row.organization_id,
    revoking_user_id,
    'additional_guardian_access_revoked',
    'additional_guardian_request',
    request_row.id::text,
    'An organization administrator revoked the additional guardian child scope and corrected team membership when no other linked child required it.'
  );

  return jsonb_build_object('request_id', request_row.id, 'state', 'revoked');
end;
$$;

revoke all on function public.request_additional_guardian(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.cancel_additional_guardian_request(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.reject_additional_guardian_request(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.approve_additional_guardian_request(uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.revoke_additional_guardian_access(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.request_additional_guardian(uuid, uuid, text, text)
  to service_role;
grant execute on function public.cancel_additional_guardian_request(uuid, uuid)
  to service_role;
grant execute on function public.reject_additional_guardian_request(uuid, uuid, text)
  to service_role;
grant execute on function public.approve_additional_guardian_request(uuid, uuid, text, text, timestamptz)
  to service_role;
grant execute on function public.revoke_additional_guardian_access(uuid, uuid, text)
  to service_role;
