-- Immutable, human-published official communication versions.
-- This migration does not change an event, execute a provider send, infer delivery,
-- acknowledge on a recipient's behalf, or turn conversation into official truth.

create table if not exists public.official_communication_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  category text not null check (category in ('official_disruption', 'critical_instruction', 'official_update')),
  state text not null default 'published' check (state in ('published', 'withdrawn')),
  current_version_number integer not null default 0 check (current_version_number >= 0),
  current_version_id uuid,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.official_communication_versions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.official_communication_threads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  event_change_log_id uuid references public.event_change_logs(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  action text not null check (action in ('published', 'corrected', 'withdrawn')),
  priority text not null check (priority in ('routine', 'action_required', 'disruption', 'critical')),
  title text not null check (char_length(trim(title)) between 3 and 160),
  body text not null check (char_length(trim(body)) between 3 and 3000),
  reason text not null check (char_length(trim(reason)) between 10 and 1000),
  event_schedule_version integer not null check (event_schedule_version > 0),
  approved_by_user_id uuid not null references public.profiles(id) on delete restrict,
  approved_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  unique (thread_id, version_number)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'official_communication_threads_current_version_fkey'
  ) then
    alter table public.official_communication_threads
      add constraint official_communication_threads_current_version_fkey
      foreign key (current_version_id)
      references public.official_communication_versions(id)
      on delete restrict;
  end if;
end
$$;

alter table public.notifications
  add column if not exists official_communication_version_id uuid
    references public.official_communication_versions(id) on delete set null;

alter table public.notification_delivery_attempts
  add column if not exists official_communication_version_id uuid
    references public.official_communication_versions(id) on delete set null;

create table if not exists public.official_communication_notification_links (
  version_id uuid not null references public.official_communication_versions(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (version_id, notification_id),
  unique (version_id, recipient_user_id)
);

create table if not exists public.official_communication_projections (
  version_id uuid not null references public.official_communication_versions(id) on delete cascade,
  surface text not null check (surface in (
    'communication_room',
    'family_mission_control',
    'family_schedule',
    'event_passport',
    'provider_delivery'
  )),
  required boolean not null default true,
  status text not null check (status in ('ready', 'pending', 'failed', 'withdrawn')),
  event_schedule_version integer not null check (event_schedule_version > 0),
  status_reason text,
  observed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (version_id, surface),
  check (status_reason is null or char_length(trim(status_reason)) between 3 and 1000)
);

create table if not exists public.official_communication_incidents (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.official_communication_versions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'resolved')),
  summary text not null check (char_length(trim(summary)) between 10 and 1000),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid references public.profiles(id) on delete set null,
  resolution_note text,
  unique (version_id),
  check ((status = 'resolved') = (resolved_at is not null)),
  check (resolution_note is null or char_length(trim(resolution_note)) between 10 and 1000)
);

create index if not exists idx_official_communication_threads_event
  on public.official_communication_threads(event_id, updated_at desc);
create index if not exists idx_official_communication_versions_current
  on public.official_communication_versions(thread_id, version_number desc);
create index if not exists idx_official_communication_links_recipient
  on public.official_communication_notification_links(recipient_user_id, created_at desc);
create index if not exists idx_official_communication_incidents_open
  on public.official_communication_incidents(organization_id, status, opened_at desc);

drop trigger if exists touch_official_communication_threads_updated_at
  on public.official_communication_threads;
create trigger touch_official_communication_threads_updated_at
  before update on public.official_communication_threads
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_official_communication_projections_updated_at
  on public.official_communication_projections;
create trigger touch_official_communication_projections_updated_at
  before update on public.official_communication_projections
  for each row execute function public.touch_updated_at();

create or replace function public.prevent_official_communication_version_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Published communication history is immutable. Create a correction or withdrawal instead.';
end;
$$;

drop trigger if exists official_communication_versions_immutable
  on public.official_communication_versions;
create trigger official_communication_versions_immutable
  before update or delete on public.official_communication_versions
  for each row execute function public.prevent_official_communication_version_mutation();

create or replace function public.copy_official_version_to_delivery_attempt()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.official_communication_version_id is null then
    select notification.official_communication_version_id
    into new.official_communication_version_id
    from public.notifications notification
    where notification.id = new.notification_id;
  end if;
  return new;
end;
$$;

drop trigger if exists copy_official_version_to_delivery_attempt
  on public.notification_delivery_attempts;
create trigger copy_official_version_to_delivery_attempt
  before insert on public.notification_delivery_attempts
  for each row execute function public.copy_official_version_to_delivery_attempt();

alter table public.official_communication_threads enable row level security;
alter table public.official_communication_versions enable row level security;
alter table public.official_communication_notification_links enable row level security;
alter table public.official_communication_projections enable row level security;
alter table public.official_communication_incidents enable row level security;

revoke all on table public.official_communication_threads from public, anon, authenticated;
revoke all on table public.official_communication_versions from public, anon, authenticated;
revoke all on table public.official_communication_notification_links from public, anon, authenticated;
revoke all on table public.official_communication_projections from public, anon, authenticated;
revoke all on table public.official_communication_incidents from public, anon, authenticated;
grant all on table public.official_communication_threads to service_role;
grant all on table public.official_communication_versions to service_role;
grant all on table public.official_communication_notification_links to service_role;
grant all on table public.official_communication_projections to service_role;
grant all on table public.official_communication_incidents to service_role;

create or replace function public.publish_official_communication_version(
  target_thread_id uuid,
  target_event_id uuid,
  publishing_user_id uuid,
  target_action text,
  target_category text,
  target_priority text,
  target_title text,
  target_body text,
  publication_reason text,
  expected_thread_version integer,
  expected_schedule_version integer,
  action_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.events%rowtype;
  thread_row public.official_communication_threads%rowtype;
  version_row public.official_communication_versions%rowtype;
  source_change_log_id uuid;
  recipient_ids uuid[];
  recipient_id uuid;
  notification_id uuid;
  notification_count integer := 0;
  next_version integer;
  is_admin boolean;
  is_coach boolean;
begin
  if target_action not in ('published', 'corrected', 'withdrawn')
    or target_category not in ('official_disruption', 'critical_instruction', 'official_update')
    or target_priority not in ('routine', 'action_required', 'disruption', 'critical') then
    raise exception 'Choose a supported publication type, priority, and action.';
  end if;
  if (target_category = 'official_disruption' and target_priority not in ('disruption', 'critical'))
    or (target_category = 'critical_instruction' and target_priority <> 'critical')
    or (target_category = 'official_update' and target_priority not in ('routine', 'action_required')) then
    raise exception 'Message type and priority do not match.';
  end if;
  if char_length(trim(target_title)) < 3 or char_length(trim(target_title)) > 160
    or char_length(trim(target_body)) < 3 or char_length(trim(target_body)) > 3000 then
    raise exception 'Published title and message are required.';
  end if;
  if char_length(trim(publication_reason)) < 10 or char_length(trim(publication_reason)) > 1000 then
    raise exception 'A publication reason of 10 to 1000 characters is required.';
  end if;
  if char_length(trim(action_idempotency_key)) < 16 or char_length(trim(action_idempotency_key)) > 200 then
    raise exception 'A durable action receipt is required.';
  end if;

  select * into event_row
  from public.events
  where id = target_event_id
  for share;
  if not found then raise exception 'Official event is unavailable.'; end if;
  if not exists (
    select 1
    from public.teams team
    join public.seasons season on season.id = team.season_id
    where team.id = event_row.team_id
      and team.status = 'active'
      and season.status = 'active'
  ) then
    raise exception 'Archived teams and seasons are read-only.';
  end if;
  if coalesce(event_row.schedule_version, 1) <> expected_schedule_version then
    raise exception 'Official event details changed. Review the current version before publishing.';
  end if;

  select exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = event_row.organization_id
      and membership.user_id = publishing_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) into is_admin;
  select exists (
    select 1 from public.team_memberships membership
    where membership.team_id = event_row.team_id
      and membership.user_id = publishing_user_id
      and membership.role = 'coach'
      and membership.status = 'active'
  ) into is_coach;
  if not is_admin and not is_coach then
    raise exception 'Only an assigned coach or league administrator can publish an official update.';
  end if;
  if target_priority = 'critical' and not is_admin then
    raise exception 'Critical instructions require a league administrator.';
  end if;

  if exists (
    select 1 from public.official_communication_versions version
    where version.idempotency_key = action_idempotency_key
  ) then
    select * into version_row
    from public.official_communication_versions version
    where version.idempotency_key = action_idempotency_key;
    return jsonb_build_object(
      'thread_id', version_row.thread_id,
      'version_id', version_row.id,
      'version_number', version_row.version_number,
      'event_schedule_version', version_row.event_schedule_version,
      'notification_count', (
        select count(*)
        from public.official_communication_notification_links link
        where link.version_id = version_row.id
      ),
      'provider_execution', 'not_started',
      'idempotent_replay', true
    );
  end if;

  if target_category = 'official_disruption' then
    select change_log.id into source_change_log_id
    from public.event_change_logs change_log
    where change_log.event_id = event_row.id
      and change_log.change_type in ('time_changed', 'location_changed', 'cancelled', 'restored')
      and change_log.actor_user_id is not null
      and case
        when (change_log.after_json ->> 'schedule_version') ~ '^[0-9]+$'
          then (change_log.after_json ->> 'schedule_version')::integer
        else 0
      end = expected_schedule_version
    order by change_log.created_at desc
    limit 1;
    if source_change_log_id is null then
      raise exception 'Publish the attributed official schedule change before its disruption message.';
    end if;
  end if;

  if target_thread_id is null then
    if target_action <> 'published' or expected_thread_version <> 0 then
      raise exception 'A new official message must start at version one.';
    end if;
    insert into public.official_communication_threads (
      organization_id, team_id, event_id, category, created_by_user_id
    ) values (
      event_row.organization_id, event_row.team_id, event_row.id, target_category, publishing_user_id
    )
    returning * into thread_row;
    next_version := 1;
  else
    select * into thread_row
    from public.official_communication_threads
    where id = target_thread_id
    for update;
    if not found
      or thread_row.organization_id <> event_row.organization_id
      or thread_row.team_id <> event_row.team_id
      or thread_row.event_id <> event_row.id then
      raise exception 'Official message thread is unavailable for this event.';
    end if;
    if target_action = 'published' then
      raise exception 'Use correction or withdrawal for an existing official message.';
    end if;
    if thread_row.category <> target_category then
      raise exception 'A correction or withdrawal must keep the original message category.';
    end if;
    if thread_row.current_version_number <> expected_thread_version then
      raise exception 'Official message changed. Review the current version before correcting it.';
    end if;
    next_version := thread_row.current_version_number + 1;
  end if;

  insert into public.official_communication_versions (
    thread_id, organization_id, team_id, event_id, event_change_log_id,
    version_number, action, priority, title, body, reason,
    event_schedule_version, approved_by_user_id, content_hash, idempotency_key
  ) values (
    thread_row.id, event_row.organization_id, event_row.team_id, event_row.id, source_change_log_id,
    next_version, target_action, target_priority, trim(target_title), trim(target_body), trim(publication_reason),
    expected_schedule_version, publishing_user_id,
    encode(digest(
      thread_row.id::text || ':' || next_version::text || ':' || target_action || ':' ||
      target_category || ':' || target_priority || ':' || trim(target_title) || ':' ||
      trim(target_body) || ':' || trim(publication_reason) || ':' ||
      expected_schedule_version::text || ':' || publishing_user_id::text,
      'sha256'
    ), 'hex'),
    action_idempotency_key
  )
  returning * into version_row;

  update public.official_communication_threads
  set current_version_number = next_version,
      current_version_id = version_row.id,
      state = case when target_action = 'withdrawn' then 'withdrawn' else 'published' end
  where id = thread_row.id;

  insert into public.official_communication_projections (
    version_id, surface, required, status, event_schedule_version, status_reason
  ) values
    (version_row.id, 'communication_room', true, 'ready', expected_schedule_version, 'Canonical published version is available to recipient-scoped reads.'),
    (version_row.id, 'family_mission_control', true, 'ready', expected_schedule_version, 'Surface reads the same official event schedule version.'),
    (version_row.id, 'family_schedule', true, 'ready', expected_schedule_version, 'Surface reads the same official event schedule version.'),
    (version_row.id, 'event_passport', true, 'ready', expected_schedule_version, 'Surface reads the same official event schedule version.'),
    (version_row.id, 'provider_delivery', false, 'pending', expected_schedule_version, 'Provider execution requires a separate approved delivery review.');

  select coalesce(array_agg(distinct guardian.parent_user_id), '{}'::uuid[])
  into recipient_ids
  from public.player_guardians guardian
  join public.players player on player.id = guardian.player_id
  where player.team_id = event_row.team_id
    and guardian.status = 'active'
    and guardian.parent_user_id is not null;

  foreach recipient_id in array recipient_ids
  loop
    insert into public.notifications (
      organization_id, recipient_user_id, team_id, event_id, notification_type,
      title, body, channel, status, provider_approval_status,
      official_communication_version_id
    ) values (
      event_row.organization_id, recipient_id, event_row.team_id, event_row.id,
      case when event_row.status = 'cancelled' then 'event_cancelled' else 'schedule_changed' end,
      trim(target_title), trim(target_body), 'email', 'pending', 'pending', version_row.id
    )
    returning id into notification_id;

    insert into public.official_communication_notification_links (
      version_id, notification_id, recipient_user_id
    ) values (version_row.id, notification_id, recipient_id);
    notification_count := notification_count + 1;
  end loop;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    event_row.organization_id,
    publishing_user_id,
    'official_communication_' || target_action,
    'official_communication_version',
    version_row.id::text,
    format(
      'An authorized human published official communication version %s for event schedule version %s. %s recipient drafts were created. No provider send or recipient acknowledgment occurred.',
      next_version,
      expected_schedule_version,
      notification_count
    )
  );

  return jsonb_build_object(
    'thread_id', thread_row.id,
    'version_id', version_row.id,
    'version_number', next_version,
    'event_schedule_version', expected_schedule_version,
    'notification_count', notification_count,
    'provider_execution', 'not_started'
  );
end;
$$;

create or replace function public.record_official_communication_projection(
  target_version_id uuid,
  target_surface text,
  target_status text,
  status_explanation text,
  reporting_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  version_row public.official_communication_versions%rowtype;
  projection_row public.official_communication_projections%rowtype;
  open_failure_count integer;
begin
  if target_surface not in (
    'communication_room', 'family_mission_control', 'family_schedule', 'event_passport', 'provider_delivery'
  ) or target_status not in ('ready', 'pending', 'failed', 'withdrawn') then
    raise exception 'Supported projection surface and state are required.';
  end if;
  if char_length(trim(status_explanation)) < 3 or char_length(trim(status_explanation)) > 1000 then
    raise exception 'Projection evidence is required.';
  end if;
  select * into version_row
  from public.official_communication_versions
  where id = target_version_id;
  if not found then raise exception 'Official communication version is unavailable.'; end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = version_row.organization_id
      and membership.user_id = reporting_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only a league administrator can record propagation evidence.';
  end if;

  insert into public.official_communication_projections (
    version_id, surface, required, status, event_schedule_version, status_reason
  ) values (
    version_row.id,
    target_surface,
    target_surface <> 'provider_delivery',
    target_status,
    version_row.event_schedule_version,
    trim(status_explanation)
  )
  on conflict (version_id, surface) do update
  set status = excluded.status,
      event_schedule_version = excluded.event_schedule_version,
      status_reason = excluded.status_reason,
      observed_at = now();

  select * into projection_row
  from public.official_communication_projections
  where version_id = version_row.id and surface = target_surface;

  select count(*) into open_failure_count
  from public.official_communication_projections projection
  where projection.version_id = version_row.id
    and projection.required
    and projection.status <> 'ready';

  if open_failure_count > 0 then
    insert into public.official_communication_incidents (
      version_id, organization_id, team_id, event_id, status, summary
    ) values (
      version_row.id,
      version_row.organization_id,
      version_row.team_id,
      version_row.event_id,
      'open',
      'One or more required family surfaces do not show the current official communication revision.'
    )
    on conflict (version_id) do update
    set status = 'open',
        summary = excluded.summary,
        resolved_at = null,
        resolved_by_user_id = null,
        resolution_note = null;
  else
    update public.official_communication_incidents
    set status = 'resolved',
        resolved_at = now(),
        resolved_by_user_id = reporting_user_id,
        resolution_note = trim(status_explanation)
    where version_id = version_row.id
      and status = 'open';
  end if;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    version_row.organization_id,
    reporting_user_id,
    'official_communication_projection_' || target_status,
    'official_communication_projection',
    version_row.id::text || ':' || target_surface,
    format('Propagation evidence recorded for %s at event schedule version %s.', target_surface, version_row.event_schedule_version)
  );

  return jsonb_build_object(
    'version_id', version_row.id,
    'surface', target_surface,
    'status', projection_row.status,
    'open_required_projection_count', open_failure_count
  );
end;
$$;

-- Acknowledgment belongs to the exact current published message version.
-- A recipient cannot accidentally acknowledge a superseded correction, and an
-- in-app acknowledgment still requires a real delivery-attempt record.
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
  version_row public.official_communication_versions%rowtype;
  thread_row public.official_communication_threads%rowtype;
  now_value timestamptz := now();
begin
  select *
  into notification_row
  from public.notifications
  where id = p_notification_id
    and recipient_user_id = p_recipient_user_id
  for update;
  if notification_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'message', 'Message is not available to this recipient.');
  end if;

  if notification_row.official_communication_version_id is not null then
    select * into version_row
    from public.official_communication_versions
    where id = notification_row.official_communication_version_id;
    select * into thread_row
    from public.official_communication_threads
    where id = version_row.thread_id;
    if version_row.id is null or thread_row.current_version_id is distinct from version_row.id then
      return jsonb_build_object(
        'ok', false,
        'code', 'superseded',
        'message', 'This message was corrected. Open the current version before acknowledging.'
      );
    end if;
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
  if version_row.id is not null
    and attempt_row.official_communication_version_id is distinct from version_row.id then
    return jsonb_build_object(
      'ok', false,
      'code', 'version_evidence_required',
      'message', 'Delivery evidence does not match the current message version.'
    );
  end if;
  if attempt_row.acknowledged_at is not null then
    return jsonb_build_object(
      'ok', true,
      'idempotentReplay', true,
      'message', 'Message was already acknowledged.',
      'acknowledgedAt', attempt_row.acknowledged_at,
      'messageVersionId', version_row.id,
      'messageVersionNumber', version_row.version_number
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
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    notification_row.organization_id,
    p_recipient_user_id,
    'notification_acknowledged',
    'notification',
    notification_row.id::text,
    case
      when version_row.id is not null then format(
        'Recipient acknowledged official message version %s. Provider acceptance, delivery, read, and acknowledgment remain separate evidence.',
        version_row.version_number
      )
      else 'Recipient acknowledged the in-app notification. Provider delivery evidence remains separate.'
    end
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Message acknowledged. Publication, delivery, read, and acknowledgment remain separate evidence.',
    'acknowledgedAt', now_value,
    'messageVersionId', version_row.id,
    'messageVersionNumber', version_row.version_number
  );
end;
$$;

revoke all on function public.publish_official_communication_version(
  uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, text
) from public, anon, authenticated;
revoke all on function public.record_official_communication_projection(uuid, text, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.acknowledge_notification_receipt(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.publish_official_communication_version(
  uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, text
) to service_role;
grant execute on function public.record_official_communication_projection(uuid, text, text, text, uuid)
  to service_role;
grant execute on function public.acknowledge_notification_receipt(uuid, uuid)
  to service_role;
