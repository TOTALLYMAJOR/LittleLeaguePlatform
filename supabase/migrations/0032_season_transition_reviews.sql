-- Explicit guardian review and administrator application for season/team moves.
-- Identity and guardian links may carry only after every current guardian and an
-- administrator act. Sensitive or operational records never carry automatically.

alter table public.players
  add column if not exists source_season_transition_review_id uuid;
alter table public.player_guardians
  add column if not exists source_season_transition_review_id uuid;

create table if not exists public.season_transition_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_season_id uuid not null references public.seasons(id) on delete restrict,
  source_team_id uuid not null references public.teams(id) on delete restrict,
  source_player_id uuid not null references public.players(id) on delete restrict,
  source_roster_status text not null check (source_roster_status in ('active', 'inactive', 'archived')),
  target_season_id uuid not null references public.seasons(id) on delete restrict,
  target_team_id uuid not null references public.teams(id) on delete restrict,
  target_player_id uuid references public.players(id) on delete restrict,
  state text not null default 'awaiting_guardian_review' check (state in (
    'awaiting_guardian_review', 'guardian_accepted', 'guardian_declined',
    'applied', 'cancelled', 'expired', 'reverted'
  )),
  carry_forward_fields text[] not null default array['child_display_identity', 'guardian_relationship'],
  reset_required_fields text[] not null default array[
    'guardian_permissions', 'custody_restrictions', 'medical_information',
    'attendance_and_rsvp', 'transportation_responsibility', 'temporary_caregivers',
    'media_consent', 'notification_preferences', 'team_conversation'
  ],
  proposed_by_user_id uuid not null references public.profiles(id) on delete restrict,
  proposal_reason text not null check (char_length(trim(proposal_reason)) between 10 and 1000),
  expires_at timestamptz not null,
  lock_version integer not null default 1 check (lock_version > 0),
  applied_by_user_id uuid references public.profiles(id) on delete restrict,
  applied_at timestamptz,
  reverted_by_user_id uuid references public.profiles(id) on delete restrict,
  reverted_at timestamptz,
  correction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_team_id <> target_team_id or source_season_id <> target_season_id),
  check (expires_at > created_at),
  check (state <> 'applied' or (applied_at is not null and target_player_id is not null)),
  check ((state = 'reverted') = (reverted_at is not null)),
  check (correction_reason is null or char_length(trim(correction_reason)) between 10 and 1000)
);

create table if not exists public.season_transition_guardian_reviews (
  transition_id uuid not null references public.season_transition_reviews(id) on delete cascade,
  guardian_user_id uuid not null references public.profiles(id) on delete restrict,
  source_player_guardian_id uuid not null references public.player_guardians(id) on delete restrict,
  decision text not null default 'pending' check (decision in ('pending', 'accepted', 'declined')),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (transition_id, guardian_user_id),
  check ((decision = 'pending') = (decided_at is null)),
  check (decision_note is null or char_length(trim(decision_note)) between 3 and 1000)
);

alter table public.players
  drop constraint if exists players_source_season_transition_review_fkey;
alter table public.players
  add constraint players_source_season_transition_review_fkey
  foreign key (source_season_transition_review_id)
  references public.season_transition_reviews(id) on delete restrict;
alter table public.player_guardians
  drop constraint if exists player_guardians_source_season_transition_review_fkey;
alter table public.player_guardians
  add constraint player_guardians_source_season_transition_review_fkey
  foreign key (source_season_transition_review_id)
  references public.season_transition_reviews(id) on delete restrict;

create unique index if not exists idx_season_transition_one_authoritative_source
  on public.season_transition_reviews(source_player_id)
  where state in ('awaiting_guardian_review', 'guardian_accepted', 'applied');
create unique index if not exists idx_players_one_transition_target
  on public.players(source_season_transition_review_id)
  where source_season_transition_review_id is not null;
create index if not exists idx_season_transition_guardian_queue
  on public.season_transition_guardian_reviews(guardian_user_id, decision, created_at desc);

drop trigger if exists touch_season_transition_reviews_updated_at on public.season_transition_reviews;
create trigger touch_season_transition_reviews_updated_at
  before update on public.season_transition_reviews
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_season_transition_guardian_reviews_updated_at on public.season_transition_guardian_reviews;
create trigger touch_season_transition_guardian_reviews_updated_at
  before update on public.season_transition_guardian_reviews
  for each row execute function public.touch_updated_at();

alter table public.season_transition_reviews enable row level security;
alter table public.season_transition_guardian_reviews enable row level security;
revoke all on table public.season_transition_reviews from public, anon, authenticated;
revoke all on table public.season_transition_guardian_reviews from public, anon, authenticated;
grant all on table public.season_transition_reviews to service_role;
grant all on table public.season_transition_guardian_reviews to service_role;

create or replace function public.propose_season_transition(
  target_source_player_id uuid,
  target_team_id uuid,
  proposing_user_id uuid,
  target_reason text,
  target_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_player public.players%rowtype;
  source_team public.teams%rowtype;
  target_team public.teams%rowtype;
  target_season public.seasons%rowtype;
  review_row public.season_transition_reviews%rowtype;
  guardian_count integer;
begin
  if char_length(trim(target_reason)) < 10 or char_length(trim(target_reason)) > 1000 then
    raise exception 'Explain why this season or team change is proposed.';
  end if;
  if target_expires_at <= now() or target_expires_at > now() + interval '30 days' then
    raise exception 'Guardian review must expire within 30 days.';
  end if;
  select * into source_player from public.players where id = target_source_player_id;
  select * into source_team from public.teams where id = source_player.team_id;
  select * into target_team from public.teams where id = target_team_id;
  select * into target_season from public.seasons where id = target_team.season_id;
  if source_player.id is null or target_team.id is null
    or source_player.organization_id <> target_team.organization_id then
    raise exception 'Source child and target team must belong to the same organization.';
  end if;
  if source_player.roster_status <> 'active' then
    raise exception 'Only an active source roster record can move to a new team or season.';
  end if;
  if target_team.status <> 'active' or target_season.status <> 'active' then
    raise exception 'Target team and season must be active.';
  end if;
  if source_player.team_id = target_team.id and source_player.season_id = target_team.season_id then
    raise exception 'Choose a different team or season.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = source_player.organization_id
      and membership.user_id = proposing_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only a league administrator can propose a season change.';
  end if;
  select count(*) into guardian_count
  from public.player_guardians guardian
  where guardian.player_id = source_player.id
    and guardian.status = 'active'
    and guardian.parent_user_id is not null;
  if guardian_count < 1 then
    raise exception 'At least one current signed-in guardian must review this change.';
  end if;

  insert into public.season_transition_reviews (
    organization_id, source_season_id, source_team_id, source_player_id, source_roster_status,
    target_season_id, target_team_id, proposed_by_user_id, proposal_reason, expires_at
  ) values (
    source_player.organization_id, source_player.season_id, source_player.team_id, source_player.id, source_player.roster_status,
    target_team.season_id, target_team.id, proposing_user_id, trim(target_reason), target_expires_at
  )
  returning * into review_row;

  insert into public.season_transition_guardian_reviews (
    transition_id, guardian_user_id, source_player_guardian_id
  )
  select review_row.id, guardian.parent_user_id, guardian.id
  from public.player_guardians guardian
  where guardian.player_id = source_player.id
    and guardian.status = 'active'
    and guardian.parent_user_id is not null;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    source_player.organization_id, proposing_user_id,
    'season_transition_proposed', 'season_transition_review', review_row.id::text,
    format('Administrator proposed a reviewed team/season change for one child with %s guardian review(s). No roster or access change occurred.', guardian_count)
  );
  return jsonb_build_object(
    'ok', true, 'transition_id', review_row.id, 'state', review_row.state,
    'guardian_review_count', guardian_count, 'provider_execution', 'not_started'
  );
end;
$$;

create or replace function public.respond_to_season_transition(
  target_transition_id uuid,
  responding_guardian_user_id uuid,
  target_decision text,
  target_note text,
  expected_lock_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  transition_row public.season_transition_reviews%rowtype;
  new_state text;
begin
  if target_decision not in ('accepted', 'declined') then
    raise exception 'Choose accept or decline.';
  end if;
  select * into transition_row
  from public.season_transition_reviews
  where id = target_transition_id
  for update;
  if not found then raise exception 'Season change review is unavailable.'; end if;
  if transition_row.state <> 'awaiting_guardian_review'
    or transition_row.expires_at <= now()
    or transition_row.lock_version <> expected_lock_version then
    raise exception 'Season change review changed or expired. Refresh before responding.';
  end if;
  update public.season_transition_guardian_reviews review
  set decision = target_decision,
      decided_at = now(),
      decision_note = nullif(trim(target_note), '')
  where transition_id = transition_row.id
    and guardian_user_id = responding_guardian_user_id
    and decision = 'pending'
    and exists (
      select 1
      from public.player_guardians guardian
      where guardian.id = review.source_player_guardian_id
        and guardian.player_id = transition_row.source_player_id
        and guardian.parent_user_id = responding_guardian_user_id
        and guardian.status = 'active'
    );
  if not found then
    raise exception 'This guardian response is unavailable or already recorded.';
  end if;

  if exists (
    select 1 from public.season_transition_guardian_reviews
    where transition_id = transition_row.id and decision = 'declined'
  ) then
    new_state := 'guardian_declined';
  elsif not exists (
    select 1 from public.season_transition_guardian_reviews
    where transition_id = transition_row.id and decision = 'pending'
  ) then
    new_state := 'guardian_accepted';
  else
    new_state := 'awaiting_guardian_review';
  end if;
  update public.season_transition_reviews
  set state = new_state,
      lock_version = lock_version + 1
  where id = transition_row.id
  returning * into transition_row;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    transition_row.organization_id, responding_guardian_user_id,
    'season_transition_guardian_' || target_decision,
    'season_transition_review', transition_row.id::text,
    'Guardian reviewed the exact carry-forward and reset scope. No roster or access change occurred.'
  );
  return jsonb_build_object(
    'ok', true, 'transition_id', transition_row.id,
    'state', transition_row.state, 'lock_version', transition_row.lock_version
  );
end;
$$;

create or replace function public.apply_season_transition(
  target_transition_id uuid,
  applying_user_id uuid,
  expected_lock_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  transition_row public.season_transition_reviews%rowtype;
  source_player public.players%rowtype;
  target_team public.teams%rowtype;
  target_season public.seasons%rowtype;
  new_player public.players%rowtype;
  guardian_count integer;
begin
  select * into transition_row
  from public.season_transition_reviews
  where id = target_transition_id
  for update;
  if not found then raise exception 'Season change review is unavailable.'; end if;
  if transition_row.state <> 'guardian_accepted'
    or transition_row.expires_at <= now()
    or transition_row.lock_version <> expected_lock_version then
    raise exception 'Every current guardian must accept the current review before application.';
  end if;
  if exists (
    select 1 from public.season_transition_guardian_reviews
    where transition_id = transition_row.id and decision <> 'accepted'
  ) then
    raise exception 'Every current guardian must accept the current review before application.';
  end if;
  if exists (
    select 1
    from public.player_guardians guardian
    where guardian.player_id = transition_row.source_player_id
      and guardian.status = 'active'
      and guardian.parent_user_id is not null
      and not exists (
        select 1
        from public.season_transition_guardian_reviews review
        where review.transition_id = transition_row.id
          and review.source_player_guardian_id = guardian.id
          and review.guardian_user_id = guardian.parent_user_id
          and review.decision = 'accepted'
      )
  ) or exists (
    select 1
    from public.season_transition_guardian_reviews review
    left join public.player_guardians guardian
      on guardian.id = review.source_player_guardian_id
      and guardian.player_id = transition_row.source_player_id
      and guardian.parent_user_id = review.guardian_user_id
      and guardian.status = 'active'
    where review.transition_id = transition_row.id
      and review.decision = 'accepted'
      and guardian.id is null
  ) then
    raise exception 'Current guardian access changed. Start a new review before applying this move.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = transition_row.organization_id
      and membership.user_id = applying_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only a league administrator can apply a reviewed season change.';
  end if;
  select * into source_player from public.players where id = transition_row.source_player_id;
  select * into target_team from public.teams where id = transition_row.target_team_id;
  select * into target_season from public.seasons where id = transition_row.target_season_id;
  if source_player.organization_id <> transition_row.organization_id
    or source_player.team_id <> transition_row.source_team_id
    or source_player.season_id <> transition_row.source_season_id then
    raise exception 'Source roster state changed. Start a new review before applying this move.';
  end if;
  if target_team.organization_id <> transition_row.organization_id
    or target_team.season_id <> transition_row.target_season_id
    or target_team.status <> 'active'
    or target_season.organization_id <> transition_row.organization_id
    or target_season.status <> 'active' then
    raise exception 'Target team or season is no longer active.';
  end if;

  insert into public.players (
    organization_id, season_id, team_id, first_name, last_initial, jersey,
    source_season_transition_review_id
  ) values (
    source_player.organization_id, target_team.season_id, target_team.id,
    source_player.first_name, source_player.last_initial, null, transition_row.id
  )
  returning * into new_player;

  insert into public.player_guardians (
    player_id, parent_user_id, relationship, status, source_season_transition_review_id
  )
  select
    new_player.id, guardian.parent_user_id, guardian.relationship, 'active', transition_row.id
  from public.season_transition_guardian_reviews review
  join public.player_guardians guardian on guardian.id = review.source_player_guardian_id
  where review.transition_id = transition_row.id
    and review.decision = 'accepted'
    and guardian.player_id = transition_row.source_player_id
    and guardian.parent_user_id = review.guardian_user_id
    and guardian.status = 'active';
  get diagnostics guardian_count = row_count;
  if guardian_count <> (
    select count(*)
    from public.season_transition_guardian_reviews
    where transition_id = transition_row.id
      and decision = 'accepted'
  ) then
    raise exception 'Current guardian access changed. Start a new review before applying this move.';
  end if;

  update public.season_transition_reviews
  set state = 'applied',
      target_player_id = new_player.id,
      applied_by_user_id = applying_user_id,
      applied_at = now(),
      lock_version = lock_version + 1
  where id = transition_row.id
  returning * into transition_row;
  update public.players
  set roster_status = 'archived'
  where id = source_player.id
    and roster_status = transition_row.source_roster_status;
  if not found then
    raise exception 'Source roster state changed. Start a new review before applying this move.';
  end if;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    transition_row.organization_id, applying_user_id,
    'season_transition_applied', 'season_transition_review', transition_row.id::text,
    format('Administrator archived the reviewed source roster row and applied child identity plus %s guardian relationship(s) to a new active roster row. Jersey, permissions, custody, medical, RSVP, attendance, transportation, caregivers, media consent, notification settings, and conversation were reset.', guardian_count)
  );
  return jsonb_build_object(
    'ok', true, 'transition_id', transition_row.id, 'state', transition_row.state,
    'target_player_id', new_player.id, 'guardian_link_count', guardian_count,
    'provider_execution', 'not_started'
  );
end;
$$;

create or replace function public.close_season_transition(
  target_transition_id uuid,
  closing_user_id uuid,
  target_reason text,
  expected_lock_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  transition_row public.season_transition_reviews%rowtype;
  closed_state text;
begin
  if char_length(trim(target_reason)) < 10 or char_length(trim(target_reason)) > 1000 then
    raise exception 'A close reason of 10 to 1000 characters is required.';
  end if;
  select * into transition_row
  from public.season_transition_reviews
  where id = target_transition_id
  for update;
  if not found
    or transition_row.state not in ('awaiting_guardian_review', 'guardian_accepted')
    or transition_row.lock_version <> expected_lock_version then
    raise exception 'This review changed or is already closed. Refresh before continuing.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = transition_row.organization_id
      and membership.user_id = closing_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only a league administrator can close a season change review.';
  end if;
  closed_state := case when transition_row.expires_at <= now() then 'expired' else 'cancelled' end;
  update public.season_transition_reviews
  set state = closed_state,
      correction_reason = trim(target_reason),
      lock_version = lock_version + 1
  where id = transition_row.id
  returning * into transition_row;
  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    transition_row.organization_id, closing_user_id,
    'season_transition_' || closed_state, 'season_transition_review', transition_row.id::text,
    'Administrator closed the guardian review with an attributed reason. No roster, access, or provider action occurred.'
  );
  return jsonb_build_object(
    'ok', true, 'transition_id', transition_row.id,
    'state', transition_row.state, 'lock_version', transition_row.lock_version,
    'provider_execution', 'not_started'
  );
end;
$$;

create or replace function public.revert_season_transition(
  target_transition_id uuid,
  reverting_user_id uuid,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  transition_row public.season_transition_reviews%rowtype;
  has_downstream boolean;
begin
  if char_length(trim(target_reason)) < 10 or char_length(trim(target_reason)) > 1000 then
    raise exception 'A correction reason of 10 to 1000 characters is required.';
  end if;
  select * into transition_row
  from public.season_transition_reviews
  where id = target_transition_id
  for update;
  if not found or transition_row.state <> 'applied' then
    raise exception 'Only an applied season change can be corrected.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = transition_row.organization_id
      and membership.user_id = reverting_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only a league administrator can correct an applied season change.';
  end if;

  select
    exists (
      select 1 from public.player_guardians
      where player_id = transition_row.target_player_id
        and source_season_transition_review_id is distinct from transition_row.id
    )
    or exists (select 1 from public.parent_invites where player_id = transition_row.target_player_id)
    or exists (select 1 from public.rsvps where player_id = transition_row.target_player_id)
    or exists (select 1 from public.guardian_authorizations where player_id = transition_row.target_player_id)
    or exists (select 1 from public.emergency_contacts where player_id = transition_row.target_player_id)
    or exists (select 1 from public.player_health_notes where player_id = transition_row.target_player_id)
    or exists (select 1 from public.learning_plans where player_id = transition_row.target_player_id)
    or exists (select 1 from public.rsvp_change_logs where player_id = transition_row.target_player_id)
    or exists (select 1 from public.event_attendance where player_id = transition_row.target_player_id)
    or exists (select 1 from public.player_media_consents where player_id = transition_row.target_player_id)
    or exists (select 1 from public.family_obligations where player_id = transition_row.target_player_id)
    or exists (select 1 from public.family_event_handoffs where player_id = transition_row.target_player_id)
    or exists (select 1 from public.additional_guardian_requests where player_id = transition_row.target_player_id)
    or exists (select 1 from public.transportation_requests where player_id = transition_row.target_player_id)
    or exists (select 1 from public.transportation_assignments where player_id = transition_row.target_player_id)
    or exists (select 1 from public.temporary_caregiver_authorizations where player_id = transition_row.target_player_id)
    or exists (
      select 1 from public.parent_replay_family_media
      where transition_row.target_player_id = any(subject_player_ids)
    )
  into has_downstream;
  if has_downstream then
    raise exception 'This change has downstream family records and needs a new reviewed correction instead of deletion.';
  end if;

  update public.season_transition_reviews
  set state = 'reverted',
      target_player_id = null,
      reverted_by_user_id = reverting_user_id,
      reverted_at = now(),
      correction_reason = trim(target_reason),
      lock_version = lock_version + 1
  where id = transition_row.id;
  delete from public.player_guardians
  where player_id = transition_row.target_player_id
    and source_season_transition_review_id = transition_row.id;
  delete from public.players
  where id = transition_row.target_player_id
    and source_season_transition_review_id = transition_row.id;
  update public.players
  set roster_status = transition_row.source_roster_status
  where id = transition_row.source_player_id
    and roster_status = 'archived';
  if not found then
    raise exception 'Source roster state changed. Use a new reviewed correction instead of restoring it automatically.';
  end if;
  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    transition_row.organization_id, reverting_user_id,
    'season_transition_reverted', 'season_transition_review', transition_row.id::text,
    'Administrator removed only transition-created child and guardian rows before downstream activity. Source-season history was preserved.'
  );
  return jsonb_build_object('ok', true, 'transition_id', transition_row.id, 'state', 'reverted');
end;
$$;

revoke all on function public.propose_season_transition(uuid, uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.respond_to_season_transition(uuid, uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.apply_season_transition(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.close_season_transition(uuid, uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.revert_season_transition(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.propose_season_transition(uuid, uuid, uuid, text, timestamptz)
  to service_role;
grant execute on function public.respond_to_season_transition(uuid, uuid, text, text, integer)
  to service_role;
grant execute on function public.apply_season_transition(uuid, uuid, integer)
  to service_role;
grant execute on function public.close_season_transition(uuid, uuid, text, integer)
  to service_role;
grant execute on function public.revert_season_transition(uuid, uuid, text)
  to service_role;
