-- Add evidence, concurrency, offline, media, volunteer, and payment records
-- without changing any existing workflow enum or state-machine value.

alter table public.organizations
  add column if not exists offline_writes_enabled boolean not null default false,
  add column if not exists provider_sends_enabled boolean not null default false,
  add column if not exists media_uploads_enabled boolean not null default false,
  add column if not exists payments_enabled boolean not null default false;

alter table public.rsvps
  add column if not exists confirmed_schedule_version integer,
  add column if not exists lock_version integer not null default 1,
  add column if not exists last_updated_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists client_action_id text;

update public.rsvps response
set confirmed_schedule_version = event.schedule_version,
    last_updated_by_user_id = response.parent_user_id
from public.events event
where event.id = response.event_id
  and response.confirmed_schedule_version is null;

create unique index if not exists idx_rsvps_client_action_receipt
  on public.rsvps(client_action_id)
  where client_action_id is not null;

create table if not exists public.offline_action_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  action_id text not null,
  action_type text not null check (action_type in ('rsvp', 'attendance', 'coach_note')),
  context_key text not null,
  base_record_version integer,
  base_schedule_version integer,
  payload_hash text not null,
  result_json jsonb not null default '{}'::jsonb,
  conflict_json jsonb,
  received_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (actor_user_id, action_id)
);

create table if not exists public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  attendance_value text not null check (attendance_value in ('present', 'absent', 'late')),
  recorded_by_user_id uuid not null references public.profiles(id) on delete restrict,
  client_action_id text,
  lock_version integer not null default 1,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id)
);

create unique index if not exists idx_event_attendance_client_action
  on public.event_attendance(client_action_id)
  where client_action_id is not null;

create table if not exists public.coach_event_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  client_action_id text,
  lock_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_coach_event_notes_client_action
  on public.coach_event_notes(client_action_id)
  where client_action_id is not null;

create table if not exists public.conflict_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_ids uuid[] not null default '{}',
  event_ids uuid[] not null default '{}',
  signal_type text not null check (signal_type in (
    'sibling_overlap',
    'guardian_transportation_overlap',
    'coach_overlap',
    'field_double_booking',
    'volunteer_overlap'
  )),
  evidence_json jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  review_note text,
  audit_event_id uuid references public.audit_events(id) on delete set null,
  idempotency_key text not null unique
);

alter table public.parent_replays
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists source_manifest_json jsonb not null default '[]'::jsonb,
  add column if not exists source_hash text,
  add column if not exists source_observed_at timestamptz;

create table if not exists public.parent_replay_engagement (
  id uuid primary key default gen_random_uuid(),
  parent_replay_id uuid not null references public.parent_replays(id) on delete cascade,
  parent_user_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz,
  activity_completed_at timestamptz,
  acknowledged_at timestamptz,
  private_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_replay_id, parent_user_id)
);

alter table public.ai_generation_runs
  add column if not exists source_manifest_json jsonb not null default '[]'::jsonb,
  add column if not exists source_hashes text[] not null default '{}',
  add column if not exists source_observed_at timestamptz,
  add column if not exists refusal_text text,
  add column if not exists validation_error text;

alter table public.notification_delivery_attempts
  add column if not exists approved_at timestamptz,
  add column if not exists provider_accepted_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz,
  add column if not exists webhook_verified_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists acknowledged_at timestamptz;

create table if not exists public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  notification_delivery_attempt_id uuid references public.notification_delivery_attempts(id) on delete set null,
  signature_verified_at timestamptz not null,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, provider_event_id)
);

create table if not exists public.volunteer_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  volunteer_signup_id uuid not null references public.volunteer_signups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key text not null,
  joined_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  promoted_at timestamptz,
  promoted_by_user_id uuid references public.profiles(id) on delete set null,
  unique (user_id, idempotency_key)
);

create table if not exists public.volunteer_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  volunteer_signup_id uuid not null references public.volunteer_signups(id) on delete cascade,
  requested_by_user_id uuid not null references public.profiles(id) on delete cascade,
  requested_recipient_user_id uuid references public.profiles(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 1000),
  idempotency_key text not null,
  requested_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  approved_at timestamptz,
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejected_by_user_id uuid references public.profiles(id) on delete set null,
  unique (requested_by_user_id, idempotency_key)
);

alter table public.volunteer_signups
  add column if not exists last_action_id text;

create unique index if not exists idx_volunteer_signups_last_action
  on public.volunteer_signups(last_action_id)
  where last_action_id is not null;

alter table public.media_items
  add column if not exists private_object_path text,
  add column if not exists content_mime_type text,
  add column if not exists content_size_bytes bigint,
  add column if not exists content_sha256 text,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_completed_at timestamptz,
  add column if not exists scan_completed_at timestamptz,
  add column if not exists scan_provider text,
  add column if not exists scan_evidence_json jsonb not null default '{}'::jsonb,
  add column if not exists family_release_approved_at timestamptz,
  add column if not exists family_release_approved_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists consent_basis text,
  add column if not exists retention_delete_after timestamptz,
  add column if not exists storage_deleted_at timestamptz,
  add column if not exists storage_deletion_evidence_json jsonb not null default '{}'::jsonb;

create table if not exists public.player_media_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  guardian_user_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('coach_only', 'team_family')),
  evidence_json jsonb not null default '{}'::jsonb,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (player_id, guardian_user_id, scope)
);

create table if not exists public.media_review_history (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  reviewer_user_id uuid not null references public.profiles(id) on delete restrict,
  previous_values_json jsonb not null default '{}'::jsonb,
  next_values_json jsonb not null default '{}'::jsonb,
  reason text not null,
  consent_evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_stripe_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade unique,
  stripe_account_id text not null unique,
  dashboard_access text not null default 'full',
  requirements_due_json jsonb not null default '[]'::jsonb,
  onboarding_started_at timestamptz,
  onboarding_completed_at timestamptz,
  charges_enabled_at timestamptz,
  payouts_enabled_at timestamptz,
  last_verified_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fee_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete cascade,
  label text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  active_from timestamptz not null default now(),
  retired_at timestamptz,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_obligations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  guardian_user_id uuid not null references public.profiles(id) on delete cascade,
  fee_definition_id uuid references public.fee_definitions(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  invoice_created_at timestamptz,
  payment_link_issued_at timestamptz,
  processing_at timestamptz,
  confirmed_at timestamptz,
  failed_at timestamptz,
  credit_applied_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_obligation_id uuid references public.family_obligations(id) on delete set null,
  sponsor_billing_record_id uuid references public.sponsor_billing_records(id) on delete set null,
  stripe_account_id text not null,
  stripe_event_id text not null unique,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_cents integer,
  currency text,
  provider_event_type text not null,
  signature_verified_at timestamptz not null,
  evidence_json jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

alter table public.sponsor_billing_records
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists payment_link_issued_at timestamptz,
  add column if not exists processing_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists failed_at timestamptz;

drop trigger if exists touch_event_attendance_updated_at on public.event_attendance;
create trigger touch_event_attendance_updated_at
  before update on public.event_attendance
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_coach_event_notes_updated_at on public.coach_event_notes;
create trigger touch_coach_event_notes_updated_at
  before update on public.coach_event_notes
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_parent_replay_engagement_updated_at on public.parent_replay_engagement;
create trigger touch_parent_replay_engagement_updated_at
  before update on public.parent_replay_engagement
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_organization_stripe_accounts_updated_at on public.organization_stripe_accounts;
create trigger touch_organization_stripe_accounts_updated_at
  before update on public.organization_stripe_accounts
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_fee_definitions_updated_at on public.fee_definitions;
create trigger touch_fee_definitions_updated_at
  before update on public.fee_definitions
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_family_obligations_updated_at on public.family_obligations;
create trigger touch_family_obligations_updated_at
  before update on public.family_obligations
  for each row execute function public.touch_updated_at();

create index if not exists idx_offline_action_receipts_context
  on public.offline_action_receipts(actor_user_id, context_key, received_at desc);
create index if not exists idx_event_attendance_event
  on public.event_attendance(event_id, recorded_at desc);
create index if not exists idx_coach_event_notes_event
  on public.coach_event_notes(event_id, created_at desc);
create index if not exists idx_conflict_reviews_open
  on public.conflict_reviews(organization_id, detected_at desc)
  where reviewed_at is null;
create index if not exists idx_parent_replay_engagement_replay
  on public.parent_replay_engagement(parent_replay_id, viewed_at);
create index if not exists idx_provider_webhook_events_attempt
  on public.provider_webhook_events(notification_delivery_attempt_id, received_at desc);
create index if not exists idx_volunteer_waitlist_open
  on public.volunteer_waitlist_entries(volunteer_signup_id, joined_at)
  where withdrawn_at is null and promoted_at is null;
create index if not exists idx_media_retention_due
  on public.media_items(retention_delete_after)
  where storage_deleted_at is null;
create index if not exists idx_family_obligations_guardian
  on public.family_obligations(guardian_user_id, created_at desc);
create index if not exists idx_payment_evidence_org
  on public.payment_evidence(organization_id, received_at desc);

create or replace function public.save_parent_rsvp_with_versions(
  p_event_id uuid,
  p_player_id uuid,
  p_parent_user_id uuid,
  p_response text,
  p_note text,
  p_expected_lock_version integer,
  p_expected_schedule_version integer,
  p_client_action_id text,
  p_context_key text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.events%rowtype;
  current_rsvp public.rsvps%rowtype;
  saved_rsvp public.rsvps%rowtype;
  existing_receipt public.offline_action_receipts%rowtype;
  result_json jsonb;
begin
  if p_response not in ('going', 'not_going', 'maybe', 'cancelled') then
    raise exception 'unsupported RSVP response';
  end if;

  select *
  into event_row
  from public.events
  where id = p_event_id
  for share;

  if event_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Event is not available.');
  end if;

  select *
  into existing_receipt
  from public.offline_action_receipts
  where actor_user_id = p_parent_user_id
    and action_id = p_client_action_id;

  if existing_receipt.id is not null then
    return existing_receipt.result_json || jsonb_build_object('idempotentReplay', true);
  end if;

  if event_row.schedule_version <> p_expected_schedule_version then
    return jsonb_build_object(
      'ok', false,
      'code', 'schedule_changed',
      'message', 'The event changed after this RSVP was opened. Confirm the new schedule before saving.',
      'currentScheduleVersion', event_row.schedule_version
    );
  end if;

  select *
  into current_rsvp
  from public.rsvps
  where event_id = p_event_id
    and player_id = p_player_id
  for update;

  if coalesce(current_rsvp.lock_version, 0) <> p_expected_lock_version then
    return jsonb_build_object(
      'ok', false,
      'code', 'guardian_conflict',
      'message', 'Another guardian updated this RSVP. Review the current response before trying again.',
      'currentLockVersion', coalesce(current_rsvp.lock_version, 0),
      'currentResponse', current_rsvp.response
    );
  end if;

  if current_rsvp.id is null then
    insert into public.rsvps (
      event_id,
      player_id,
      parent_user_id,
      response,
      note,
      responded_at,
      confirmed_schedule_version,
      lock_version,
      last_updated_by_user_id,
      client_action_id
    ) values (
      p_event_id,
      p_player_id,
      p_parent_user_id,
      p_response,
      p_note,
      now(),
      event_row.schedule_version,
      1,
      p_parent_user_id,
      p_client_action_id
    )
    returning * into saved_rsvp;
  else
    update public.rsvps
    set parent_user_id = p_parent_user_id,
        response = p_response,
        note = p_note,
        responded_at = now(),
        confirmed_schedule_version = event_row.schedule_version,
        lock_version = current_rsvp.lock_version + 1,
        last_updated_by_user_id = p_parent_user_id,
        client_action_id = p_client_action_id
    where id = current_rsvp.id
      and lock_version = p_expected_lock_version
    returning * into saved_rsvp;
  end if;

  if saved_rsvp.id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'guardian_conflict',
      'message', 'Another guardian updated this RSVP. Review the current response before trying again.'
    );
  end if;

  insert into public.rsvp_change_logs (
    event_id,
    player_id,
    parent_user_id,
    previous_response,
    next_response,
    note,
    created_at
  ) values (
    p_event_id,
    p_player_id,
    p_parent_user_id,
    current_rsvp.response,
    p_response,
    p_note,
    now()
  );

  result_json := jsonb_build_object(
    'ok', true,
    'message', 'RSVP saved to current team records.',
    'rsvp', jsonb_build_object(
      'id', saved_rsvp.id,
      'event_id', saved_rsvp.event_id,
      'player_id', saved_rsvp.player_id,
      'parent_user_id', saved_rsvp.parent_user_id,
      'response', saved_rsvp.response,
      'note', saved_rsvp.note,
      'responded_at', saved_rsvp.responded_at,
      'confirmed_schedule_version', saved_rsvp.confirmed_schedule_version,
      'lock_version', saved_rsvp.lock_version,
      'client_action_id', saved_rsvp.client_action_id
    )
  );

  insert into public.offline_action_receipts (
    organization_id,
    season_id,
    team_id,
    actor_user_id,
    action_id,
    action_type,
    context_key,
    base_record_version,
    base_schedule_version,
    payload_hash,
    result_json,
    received_at,
    applied_at
  ) values (
    event_row.organization_id,
    event_row.season_id,
    event_row.team_id,
    p_parent_user_id,
    p_client_action_id,
    'rsvp',
    concat(
      'parent:',
      event_row.organization_id::text,
      ':',
      event_row.season_id::text,
      ':',
      event_row.team_id::text
    ),
    p_expected_lock_version,
    p_expected_schedule_version,
    p_payload_hash,
    result_json,
    now(),
    now()
  );

  return result_json;
end;
$$;

revoke all on function public.save_parent_rsvp_with_versions(
  uuid, uuid, uuid, text, text, integer, integer, text, text, text
) from public, anon, authenticated;
grant execute on function public.save_parent_rsvp_with_versions(
  uuid, uuid, uuid, text, text, integer, integer, text, text, text
) to service_role;

create or replace function public.save_coach_attendance_with_versions(
  p_event_id uuid,
  p_player_id uuid,
  p_actor_user_id uuid,
  p_attendance_value text,
  p_expected_lock_version integer,
  p_expected_schedule_version integer,
  p_client_action_id text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.events%rowtype;
  player_row public.players%rowtype;
  current_attendance public.event_attendance%rowtype;
  saved_attendance public.event_attendance%rowtype;
  existing_receipt public.offline_action_receipts%rowtype;
  result_json jsonb;
  season_is_archived boolean;
begin
  if p_attendance_value not in ('present', 'absent', 'late') then
    raise exception 'unsupported attendance value';
  end if;

  select * into event_row from public.events where id = p_event_id for share;
  select * into player_row from public.players where id = p_player_id for share;
  if event_row.id is null or player_row.id is null or event_row.team_id <> player_row.team_id then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Player attendance is not available for this event.');
  end if;
  select status = 'archived' into season_is_archived from public.seasons where id = event_row.season_id;
  if coalesce(season_is_archived, false) then
    return jsonb_build_object('ok', false, 'code', 'archived', 'message', 'Archived season attendance is read-only.');
  end if;

  select * into existing_receipt
  from public.offline_action_receipts
  where actor_user_id = p_actor_user_id and action_id = p_client_action_id;
  if existing_receipt.id is not null then
    return existing_receipt.result_json || jsonb_build_object('idempotentReplay', true);
  end if;
  if event_row.schedule_version <> p_expected_schedule_version then
    return jsonb_build_object(
      'ok', false,
      'code', 'schedule_changed',
      'message', 'The event changed after Field Mode opened. Refresh the game-day pack before syncing.',
      'currentScheduleVersion', event_row.schedule_version
    );
  end if;

  select * into current_attendance
  from public.event_attendance
  where event_id = p_event_id and player_id = p_player_id
  for update;
  if coalesce(current_attendance.lock_version, 0) <> p_expected_lock_version then
    return jsonb_build_object(
      'ok', false,
      'code', 'coach_conflict',
      'message', 'Attendance was updated on another device. Review the current value before retrying.',
      'currentLockVersion', coalesce(current_attendance.lock_version, 0),
      'currentAttendance', current_attendance.attendance_value
    );
  end if;

  if current_attendance.id is null then
    insert into public.event_attendance (
      organization_id, season_id, team_id, event_id, player_id,
      attendance_value, recorded_by_user_id, client_action_id, lock_version
    ) values (
      event_row.organization_id, event_row.season_id, event_row.team_id, p_event_id, p_player_id,
      p_attendance_value, p_actor_user_id, p_client_action_id, 1
    ) returning * into saved_attendance;
  else
    update public.event_attendance
    set attendance_value = p_attendance_value,
        recorded_by_user_id = p_actor_user_id,
        client_action_id = p_client_action_id,
        lock_version = current_attendance.lock_version + 1,
        recorded_at = now()
    where id = current_attendance.id and lock_version = p_expected_lock_version
    returning * into saved_attendance;
  end if;

  if saved_attendance.id is null then
    return jsonb_build_object('ok', false, 'code', 'coach_conflict', 'message', 'Attendance changed before this update was applied.');
  end if;

  result_json := jsonb_build_object(
    'ok', true,
    'message', 'Attendance recorded in current team records.',
    'attendance', jsonb_build_object(
      'id', saved_attendance.id,
      'event_id', saved_attendance.event_id,
      'player_id', saved_attendance.player_id,
      'attendance_value', saved_attendance.attendance_value,
      'lock_version', saved_attendance.lock_version,
      'recorded_at', saved_attendance.recorded_at
    )
  );
  insert into public.offline_action_receipts (
    organization_id, season_id, team_id, actor_user_id, action_id, action_type,
    context_key, base_record_version, base_schedule_version, payload_hash,
    result_json, received_at, applied_at
  ) values (
    event_row.organization_id, event_row.season_id, event_row.team_id, p_actor_user_id,
    p_client_action_id, 'attendance',
    concat('coach:', event_row.organization_id::text, ':', event_row.season_id::text, ':', event_row.team_id::text),
    p_expected_lock_version, p_expected_schedule_version, p_payload_hash,
    result_json, now(), now()
  );
  return result_json;
end;
$$;

revoke all on function public.save_coach_attendance_with_versions(
  uuid, uuid, uuid, text, integer, integer, text, text
) from public, anon, authenticated;
grant execute on function public.save_coach_attendance_with_versions(
  uuid, uuid, uuid, text, integer, integer, text, text
) to service_role;

create or replace function public.save_coach_event_note_with_receipt(
  p_event_id uuid,
  p_actor_user_id uuid,
  p_body text,
  p_expected_schedule_version integer,
  p_client_action_id text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.events%rowtype;
  existing_receipt public.offline_action_receipts%rowtype;
  saved_note public.coach_event_notes%rowtype;
  result_json jsonb;
  season_is_archived boolean;
begin
  if char_length(trim(p_body)) < 1 or char_length(trim(p_body)) > 4000 then
    raise exception 'invalid coach note length';
  end if;
  select * into event_row from public.events where id = p_event_id for share;
  if event_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Event is not available.');
  end if;
  select status = 'archived' into season_is_archived from public.seasons where id = event_row.season_id;
  if coalesce(season_is_archived, false) then
    return jsonb_build_object('ok', false, 'code', 'archived', 'message', 'Archived season notes are read-only.');
  end if;
  select * into existing_receipt
  from public.offline_action_receipts
  where actor_user_id = p_actor_user_id and action_id = p_client_action_id;
  if existing_receipt.id is not null then
    return existing_receipt.result_json || jsonb_build_object('idempotentReplay', true);
  end if;
  if event_row.schedule_version <> p_expected_schedule_version then
    return jsonb_build_object(
      'ok', false,
      'code', 'schedule_changed',
      'message', 'The event changed after Field Mode opened. Refresh before syncing this note.',
      'currentScheduleVersion', event_row.schedule_version
    );
  end if;

  insert into public.coach_event_notes (
    organization_id, season_id, team_id, event_id, author_user_id, body, client_action_id
  ) values (
    event_row.organization_id, event_row.season_id, event_row.team_id, p_event_id,
    p_actor_user_id, trim(p_body), p_client_action_id
  ) returning * into saved_note;
  result_json := jsonb_build_object(
    'ok', true,
    'message', 'Operational coach note saved. It was not published or sent.',
    'note', jsonb_build_object(
      'id', saved_note.id,
      'event_id', saved_note.event_id,
      'body', saved_note.body,
      'created_at', saved_note.created_at
    )
  );
  insert into public.offline_action_receipts (
    organization_id, season_id, team_id, actor_user_id, action_id, action_type,
    context_key, base_schedule_version, payload_hash, result_json, received_at, applied_at
  ) values (
    event_row.organization_id, event_row.season_id, event_row.team_id, p_actor_user_id,
    p_client_action_id, 'coach_note',
    concat('coach:', event_row.organization_id::text, ':', event_row.season_id::text, ':', event_row.team_id::text),
    p_expected_schedule_version, p_payload_hash, result_json, now(), now()
  );
  return result_json;
end;
$$;

revoke all on function public.save_coach_event_note_with_receipt(
  uuid, uuid, text, integer, text, text
) from public, anon, authenticated;
grant execute on function public.save_coach_event_note_with_receipt(
  uuid, uuid, text, integer, text, text
) to service_role;

create or replace function public.claim_volunteer_role_compare_and_set(
  p_signup_id uuid,
  p_user_id uuid,
  p_action_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_row public.volunteer_signups%rowtype;
begin
  select * into signup_row from public.volunteer_signups where id = p_signup_id for update;
  if signup_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Volunteer role was not found.');
  end if;
  if signup_row.last_action_id = p_action_id and signup_row.assigned_user_id = p_user_id then
    return jsonb_build_object('ok', true, 'idempotentReplay', true, 'message', 'Volunteer role was already assigned to you.');
  end if;
  if signup_row.status <> 'open' or signup_row.assigned_user_id is not null then
    return jsonb_build_object(
      'ok', false,
      'code', 'already_claimed',
      'message', 'Another family claimed this volunteer role first. You can join the waitlist.'
    );
  end if;
  update public.volunteer_signups
  set assigned_user_id = p_user_id,
      status = 'filled',
      last_action_id = p_action_id
  where id = p_signup_id and status = 'open' and assigned_user_id is null
  returning * into signup_row;
  if signup_row.assigned_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'already_claimed', 'message', 'Volunteer role changed before this claim was applied.');
  end if;
  return jsonb_build_object(
    'ok', true,
    'message', 'Volunteer role assigned to your account.',
    'signup', jsonb_build_object(
      'id', signup_row.id,
      'status', signup_row.status,
      'assigned_user_id', signup_row.assigned_user_id
    )
  );
end;
$$;

revoke all on function public.claim_volunteer_role_compare_and_set(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_volunteer_role_compare_and_set(uuid, uuid, text)
  to service_role;

create or replace function public.promote_volunteer_waitlist_entry(
  p_waitlist_entry_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  waitlist_row public.volunteer_waitlist_entries%rowtype;
  signup_row public.volunteer_signups%rowtype;
begin
  select * into waitlist_row
  from public.volunteer_waitlist_entries
  where id = p_waitlist_entry_id
  for update;
  if waitlist_row.id is null or waitlist_row.withdrawn_at is not null or waitlist_row.promoted_at is not null then
    return jsonb_build_object('ok', false, 'code', 'waitlist_unavailable', 'message', 'Waitlist entry is no longer available.');
  end if;
  select * into signup_row
  from public.volunteer_signups
  where id = waitlist_row.volunteer_signup_id
  for update;
  if signup_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Volunteer role was not found.');
  end if;
  if signup_row.assigned_user_id is not null and signup_row.status = 'filled' then
    return jsonb_build_object('ok', false, 'code', 'role_still_filled', 'message', 'Current volunteer assignment must be withdrawn before promotion.');
  end if;
  update public.volunteer_signups
  set assigned_user_id = waitlist_row.user_id,
      status = 'filled',
      last_action_id = concat('waitlist-promotion:', waitlist_row.id::text)
  where id = signup_row.id;
  update public.volunteer_waitlist_entries
  set promoted_at = now(),
      promoted_by_user_id = p_actor_user_id
  where id = waitlist_row.id;
  return jsonb_build_object(
    'ok', true,
    'message', 'Waitlisted volunteer promoted after staff review.',
    'signupId', signup_row.id,
    'userId', waitlist_row.user_id
  );
end;
$$;

revoke all on function public.promote_volunteer_waitlist_entry(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.promote_volunteer_waitlist_entry(uuid, uuid)
  to service_role;

alter table public.offline_action_receipts enable row level security;
alter table public.event_attendance enable row level security;
alter table public.coach_event_notes enable row level security;
alter table public.conflict_reviews enable row level security;
alter table public.parent_replay_engagement enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.volunteer_waitlist_entries enable row level security;
alter table public.volunteer_transfer_requests enable row level security;
alter table public.player_media_consents enable row level security;
alter table public.media_review_history enable row level security;
alter table public.organization_stripe_accounts enable row level security;
alter table public.fee_definitions enable row level security;
alter table public.family_obligations enable row level security;
alter table public.payment_evidence enable row level security;

create policy "actors read own offline action receipts" on public.offline_action_receipts
  for select using (
    actor_user_id = auth.uid()
    or public.current_user_can_manage_team(team_id)
    or public.current_user_is_org_admin(organization_id)
  );
create policy "actors create scoped offline action receipts" on public.offline_action_receipts
  for insert with check (
    actor_user_id = auth.uid()
    and (
      public.current_user_can_manage_team(team_id)
      or exists (
        select 1
        from public.players player
        join public.player_guardians guardian on guardian.player_id = player.id
        where player.team_id = offline_action_receipts.team_id
          and guardian.parent_user_id = auth.uid()
          and guardian.status = 'active'
      )
    )
  );

create policy "linked families and team staff read attendance" on public.event_attendance
  for select using (
    public.current_user_can_manage_team(team_id)
    or exists (
      select 1 from public.player_guardians guardian
      where guardian.player_id = event_attendance.player_id
        and guardian.parent_user_id = auth.uid()
        and guardian.status = 'active'
    )
  );
create policy "team staff manage attendance" on public.event_attendance
  for all using (public.current_user_can_manage_team(team_id))
  with check (public.current_user_can_manage_team(team_id));

create policy "team staff manage coach event notes" on public.coach_event_notes
  for all using (public.current_user_can_manage_team(team_id))
  with check (
    public.current_user_can_manage_team(team_id)
    and author_user_id = auth.uid()
  );

create policy "organization admins read conflict reviews" on public.conflict_reviews
  for select using (public.current_user_is_org_admin(organization_id));
create policy "organization admins manage conflict reviews" on public.conflict_reviews
  for all using (public.current_user_is_org_admin(organization_id))
  with check (public.current_user_is_org_admin(organization_id));

create policy "families and team staff read replay engagement" on public.parent_replay_engagement
  for select using (
    parent_user_id = auth.uid()
    or exists (
      select 1 from public.parent_replays replay
      where replay.id = parent_replay_engagement.parent_replay_id
        and public.current_user_can_manage_team(replay.team_id)
    )
  );
create policy "parents manage own replay engagement" on public.parent_replay_engagement
  for all using (parent_user_id = auth.uid())
  with check (parent_user_id = auth.uid());

create policy "organization admins read provider webhook evidence" on public.provider_webhook_events
  for select using (
    exists (
      select 1
      from public.notification_delivery_attempts attempt
      join public.notifications notification on notification.id = attempt.notification_id
      join public.teams team on team.id = notification.team_id
      where attempt.id = provider_webhook_events.notification_delivery_attempt_id
        and public.current_user_is_org_admin(team.organization_id)
    )
  );

create policy "users and team staff read volunteer waitlists" on public.volunteer_waitlist_entries
  for select using (
    user_id = auth.uid()
    or public.current_user_can_manage_team(team_id)
  );
create policy "users join own volunteer waitlists" on public.volunteer_waitlist_entries
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.team_memberships membership
      where membership.team_id = volunteer_waitlist_entries.team_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );
create policy "users withdraw own volunteer waitlists" on public.volunteer_waitlist_entries
  for update using (user_id = auth.uid() or public.current_user_can_manage_team(team_id))
  with check (user_id = auth.uid() or public.current_user_can_manage_team(team_id));

create policy "users and team staff read volunteer transfers" on public.volunteer_transfer_requests
  for select using (
    requested_by_user_id = auth.uid()
    or requested_recipient_user_id = auth.uid()
    or public.current_user_can_manage_team(team_id)
  );
create policy "users request own volunteer transfers" on public.volunteer_transfer_requests
  for insert with check (
    requested_by_user_id = auth.uid()
    and exists (
      select 1 from public.team_memberships membership
      where membership.team_id = volunteer_transfer_requests.team_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );
create policy "requesters and staff update volunteer transfers" on public.volunteer_transfer_requests
  for update using (
    requested_by_user_id = auth.uid()
    or public.current_user_can_manage_team(team_id)
  ) with check (
    requested_by_user_id = auth.uid()
    or public.current_user_can_manage_team(team_id)
  );

create policy "guardians and staff read media consent" on public.player_media_consents
  for select using (
    guardian_user_id = auth.uid()
    or public.current_user_can_manage_team(team_id)
    or public.current_user_is_org_admin(organization_id)
  );
create policy "guardians manage own media consent" on public.player_media_consents
  for all using (guardian_user_id = auth.uid())
  with check (
    guardian_user_id = auth.uid()
    and exists (
      select 1 from public.player_guardians guardian
      where guardian.player_id = player_media_consents.player_id
        and guardian.parent_user_id = auth.uid()
        and guardian.status = 'active'
    )
  );

create policy "team staff read media review history" on public.media_review_history
  for select using (
    exists (
      select 1 from public.media_items media
      where media.id = media_review_history.media_item_id
        and public.current_user_can_manage_team(media.team_id)
    )
  );
create policy "team staff create media review history" on public.media_review_history
  for insert with check (
    reviewer_user_id = auth.uid()
    and exists (
      select 1 from public.media_items media
      where media.id = media_review_history.media_item_id
        and public.current_user_can_manage_team(media.team_id)
    )
  );

create policy "organization admins manage stripe account evidence" on public.organization_stripe_accounts
  for all using (public.current_user_is_org_admin(organization_id))
  with check (public.current_user_is_org_admin(organization_id));
create policy "organization members read fee definitions" on public.fee_definitions
  for select using (
    public.current_user_is_org_admin(organization_id)
    or exists (
      select 1 from public.teams team
      where team.organization_id = fee_definitions.organization_id
        and public.current_user_can_access_team(team.id)
    )
  );
create policy "organization admins manage fee definitions" on public.fee_definitions
  for all using (public.current_user_is_org_admin(organization_id))
  with check (
    public.current_user_is_org_admin(organization_id)
    and created_by_user_id = auth.uid()
  );
create policy "guardians and admins read family obligations" on public.family_obligations
  for select using (
    guardian_user_id = auth.uid()
    or public.current_user_is_org_admin(organization_id)
  );
create policy "organization admins manage family obligations" on public.family_obligations
  for all using (public.current_user_is_org_admin(organization_id))
  with check (public.current_user_is_org_admin(organization_id));
create policy "guardians and admins read payment evidence" on public.payment_evidence
  for select using (
    public.current_user_is_org_admin(organization_id)
    or exists (
      select 1 from public.family_obligations obligation
      where obligation.id = payment_evidence.family_obligation_id
        and obligation.guardian_user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit)
values ('leaguepilot-private-media', 'leaguepilot-private-media', false, 15728640)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

create policy "team staff upload quarantined private media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'leaguepilot-private-media'
    and split_part(name, '/', 1) in (
      select team.organization_id::text
      from public.teams team
      where public.current_user_can_manage_team(team.id)
    )
  );

create policy "authorized users read scoped private media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'leaguepilot-private-media'
    and split_part(name, '/', 1) in (
      select team.organization_id::text
      from public.teams team
      where public.current_user_can_manage_team(team.id)
         or public.current_user_can_access_team(team.id)
    )
  );
