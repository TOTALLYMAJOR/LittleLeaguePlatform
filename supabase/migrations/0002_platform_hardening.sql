-- Little League HQ platform hardening.
-- This migration extends the MVP schema into a production-ready youth sports model.
-- It keeps sensitive child data scoped and separates identity, access, approval,
-- notification consent, provider delivery, and generated content review.

create extension if not exists btree_gist;

create or replace function public.current_user_is_player_guardian(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.player_guardians guardian
    where guardian.player_id = target_player_id
      and guardian.parent_user_id = auth.uid()
      and guardian.status = 'active'
  );
$$;

create or replace function public.current_user_can_manage_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.players player
    where player.id = target_player_id
      and public.current_user_can_manage_team(player.team_id)
  );
$$;

create table public.guardian_authorizations (
  id uuid primary key default gen_random_uuid(),
  player_guardian_id uuid not null references public.player_guardians(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  parent_user_id uuid references public.profiles(id) on delete set null,
  authorization_type text not null check (authorization_type in ('pickup', 'medical_decision', 'emergency_contact', 'media_release', 'team_communication')),
  allowed boolean not null default true,
  note text,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_guardian_id, authorization_type)
);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text not null,
  priority integer not null default 1 check (priority > 0),
  can_pickup boolean not null default false,
  note text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_health_notes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  note_type text not null check (note_type in ('allergy', 'medical', 'accommodation', 'general')),
  summary text not null,
  private_note text,
  visibility text not null default 'team_managers' check (visibility in ('team_managers', 'assigned_coaches', 'guardians_only')),
  created_by_user_id uuid references public.profiles(id) on delete set null,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  channel text not null check (channel in ('push', 'email', 'sms')),
  notification_type text not null check (notification_type in ('schedule_changed', 'event_cancelled', 'new_event', 'invite_sent', 'invite_recovered', 'parent_replay_ready', 'weather_alert', 'chat_announcement', 'volunteer_reminder', 'snack_reminder')),
  enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'America/Chicago',
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (organization_id is not null or team_id is not null)
);

create table public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  provider text not null,
  provider_message_id text,
  channel text not null check (channel in ('push', 'email', 'sms')),
  status text not null check (status in ('queued', 'sent', 'failed', 'suppressed')),
  error_code text,
  error_message text,
  attempted_at timestamptz not null default now()
);

create table public.field_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  map_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.event_series (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  title text not null,
  event_type text not null check (event_type in ('game', 'practice', 'team_event')),
  recurrence_rule text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.events
  add column if not exists event_series_id uuid references public.event_series(id) on delete set null,
  add column if not exists field_location_id uuid references public.field_locations(id) on delete set null,
  add column if not exists cancelled_reason text,
  add column if not exists schedule_version integer not null default 1;

create table public.event_change_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  change_type text not null check (change_type in ('created', 'time_changed', 'location_changed', 'cancelled', 'completed', 'restored')),
  before_json jsonb,
  after_json jsonb not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.field_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  field_location_id uuid not null references public.field_locations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'reserved' check (status in ('reserved', 'released', 'cancelled')),
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  exclude using gist (
    field_location_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'reserved')
);

create table public.team_chat_threads (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.team_chat_channels(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  root_message_id uuid not null references public.team_chat_messages(id) on delete cascade,
  title text,
  status text not null default 'open' check (status in ('open', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (root_message_id)
);

alter table public.team_chat_messages
  add column if not exists thread_id uuid references public.team_chat_threads(id) on delete set null,
  add column if not exists reply_to_message_id uuid references public.team_chat_messages(id) on delete set null,
  add column if not exists retained_until timestamptz,
  add column if not exists reported_count integer not null default 0;

create table public.team_chat_message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.team_chat_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table public.team_chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.team_chat_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('thanks', 'seen', 'question', 'heart')),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, reaction)
);

create table public.team_chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.team_chat_messages(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  uploaded_by_user_id uuid not null references public.profiles(id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video', 'file')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected', 'removed')),
  created_at timestamptz not null default now()
);

create table public.team_chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.team_chat_messages(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  reporter_user_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'action_taken')),
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, reporter_user_id)
);

create table public.parent_replay_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  theme_key text check (theme_key in ('soccer', 'football', 'baseball', 'scouts', 'golf', 'tennis', 'swim', 'generic')),
  focus_area text not null,
  age_band text,
  title text not null,
  home_activities jsonb not null,
  parent_tip text not null,
  team_quest text not null,
  skill_cards text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parent_replays
  add column if not exists template_id uuid references public.parent_replay_templates(id) on delete set null,
  add column if not exists generation_source text not null default 'deterministic' check (generation_source in ('deterministic', 'ai_draft', 'coach_written')),
  add column if not exists reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists published_at timestamptz;

create table public.ai_generation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  feature text not null check (feature in ('parent_replay', 'learning_plan', 'weekly_digest')),
  provider text not null,
  model text not null,
  prompt_hash text not null,
  output_json jsonb not null,
  review_status text not null default 'draft' check (review_status in ('draft', 'approved', 'rejected')),
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  parent_replay_id uuid references public.parent_replays(id) on delete set null,
  ai_generation_run_id uuid references public.ai_generation_runs(id) on delete set null,
  title text not null,
  goals jsonb not null,
  activities jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sponsor_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  price_cents integer check (price_cents is null or price_cents >= 0),
  benefits jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sponsors
  add column if not exists package_id uuid references public.sponsor_packages(id) on delete set null,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

create table public.sponsor_placements (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  placement_key text not null check (placement_key in ('team_portal', 'weekly_digest', 'storybook', 'registration', 'field_map')),
  status text not null default 'active' check (status in ('active', 'paused', 'expired')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sponsor_assets (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  asset_type text not null check (asset_type in ('logo', 'banner', 'link', 'copy')),
  url text,
  copy text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.registration_approval_actions (
  id uuid primary key default gen_random_uuid(),
  registration_request_id uuid not null references public.registration_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  reviewed_by_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('approved', 'rejected', 'matched_existing_player', 'created_player', 'created_guardian', 'created_membership', 'invite_queued')),
  result_json jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index idx_guardian_authorizations_player_id on public.guardian_authorizations(player_id);
create index idx_emergency_contacts_player_id on public.emergency_contacts(player_id);
create index idx_player_health_notes_player_id on public.player_health_notes(player_id);
create index idx_notification_preferences_user_team on public.notification_preferences(user_id, team_id);
create unique index idx_notification_preferences_unique_scope
  on public.notification_preferences (
    user_id,
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(team_id, '00000000-0000-0000-0000-000000000000'::uuid),
    channel,
    notification_type
  );
create index idx_notification_delivery_attempts_notification on public.notification_delivery_attempts(notification_id);
create index idx_field_reservations_field_time on public.field_reservations(field_location_id, starts_at, ends_at);
create index idx_event_change_logs_event_id on public.event_change_logs(event_id);
create index idx_team_chat_threads_channel_id on public.team_chat_threads(channel_id);
create index idx_team_chat_message_reads_user_id on public.team_chat_message_reads(user_id);
create index idx_team_chat_reports_status on public.team_chat_reports(team_id, status);
create index idx_learning_plans_team_player on public.learning_plans(team_id, player_id);
create index idx_sponsor_placements_org_team on public.sponsor_placements(organization_id, team_id);
create index idx_registration_approval_actions_request on public.registration_approval_actions(registration_request_id);

create trigger touch_guardian_authorizations_updated_at before update on public.guardian_authorizations for each row execute function public.touch_updated_at();
create trigger touch_emergency_contacts_updated_at before update on public.emergency_contacts for each row execute function public.touch_updated_at();
create trigger touch_player_health_notes_updated_at before update on public.player_health_notes for each row execute function public.touch_updated_at();
create trigger touch_notification_preferences_updated_at before update on public.notification_preferences for each row execute function public.touch_updated_at();
create trigger touch_field_locations_updated_at before update on public.field_locations for each row execute function public.touch_updated_at();
create trigger touch_event_series_updated_at before update on public.event_series for each row execute function public.touch_updated_at();
create trigger touch_field_reservations_updated_at before update on public.field_reservations for each row execute function public.touch_updated_at();
create trigger touch_team_chat_threads_updated_at before update on public.team_chat_threads for each row execute function public.touch_updated_at();
create trigger touch_parent_replay_templates_updated_at before update on public.parent_replay_templates for each row execute function public.touch_updated_at();
create trigger touch_learning_plans_updated_at before update on public.learning_plans for each row execute function public.touch_updated_at();
create trigger touch_sponsor_packages_updated_at before update on public.sponsor_packages for each row execute function public.touch_updated_at();
create trigger touch_sponsor_placements_updated_at before update on public.sponsor_placements for each row execute function public.touch_updated_at();

alter table public.guardian_authorizations enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.player_health_notes enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_delivery_attempts enable row level security;
alter table public.field_locations enable row level security;
alter table public.event_series enable row level security;
alter table public.event_change_logs enable row level security;
alter table public.field_reservations enable row level security;
alter table public.team_chat_threads enable row level security;
alter table public.team_chat_message_reads enable row level security;
alter table public.team_chat_reactions enable row level security;
alter table public.team_chat_attachments enable row level security;
alter table public.team_chat_reports enable row level security;
alter table public.parent_replay_templates enable row level security;
alter table public.ai_generation_runs enable row level security;
alter table public.learning_plans enable row level security;
alter table public.sponsor_packages enable row level security;
alter table public.sponsor_placements enable row level security;
alter table public.sponsor_assets enable row level security;
alter table public.registration_approval_actions enable row level security;

create policy "guardians and team managers read guardian authorizations" on public.guardian_authorizations
  for select using (public.current_user_is_player_guardian(player_id) or public.current_user_can_manage_player(player_id));

create policy "team managers manage guardian authorizations" on public.guardian_authorizations
  for all using (public.current_user_can_manage_player(player_id)) with check (public.current_user_can_manage_player(player_id));

create policy "guardians and team managers read emergency contacts" on public.emergency_contacts
  for select using (public.current_user_is_player_guardian(player_id) or public.current_user_can_manage_player(player_id));

create policy "guardians and team managers manage emergency contacts" on public.emergency_contacts
  for all using (public.current_user_is_player_guardian(player_id) or public.current_user_can_manage_player(player_id))
  with check (public.current_user_is_player_guardian(player_id) or public.current_user_can_manage_player(player_id));

create policy "guardians and team managers read health notes by visibility" on public.player_health_notes
  for select using (
    public.current_user_can_manage_player(player_id)
    or (visibility = 'guardians_only' and public.current_user_is_player_guardian(player_id))
  );

create policy "team managers manage health notes" on public.player_health_notes
  for all using (public.current_user_can_manage_player(player_id)) with check (public.current_user_can_manage_player(player_id));

create policy "users manage own notification preferences" on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "team managers read notification preferences for teams" on public.notification_preferences
  for select using (team_id is not null and public.current_user_can_manage_team(team_id));

create policy "notification recipients and team managers read delivery attempts" on public.notification_delivery_attempts
  for select using (
    exists (
      select 1
      from public.notifications notification
      where notification.id = notification_delivery_attempts.notification_id
        and (
          notification.recipient_user_id = auth.uid()
          or public.current_user_can_manage_team(notification.team_id)
        )
    )
  );

create policy "team managers create delivery attempts" on public.notification_delivery_attempts
  for insert with check (
    exists (
      select 1
      from public.notifications notification
      where notification.id = notification_delivery_attempts.notification_id
        and public.current_user_can_manage_team(notification.team_id)
    )
  );

create policy "organization members read field locations" on public.field_locations
  for select using (
    public.current_user_is_org_admin(organization_id)
    or exists (
      select 1
      from public.teams team
      where team.organization_id = field_locations.organization_id
        and public.current_user_can_access_team(team.id)
    )
  );

create policy "organization admins manage field locations" on public.field_locations
  for all using (public.current_user_is_org_admin(organization_id)) with check (public.current_user_is_org_admin(organization_id));

create policy "team members read event series" on public.event_series
  for select using (public.current_user_can_access_team(team_id));

create policy "team managers manage event series" on public.event_series
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team members read event change logs" on public.event_change_logs
  for select using (public.current_user_can_access_team(team_id));

create policy "team managers create event change logs" on public.event_change_logs
  for insert with check (public.current_user_can_manage_team(team_id));

create policy "team members read field reservations" on public.field_reservations
  for select using (
    event_id is not null
    and exists (
      select 1 from public.events event
      where event.id = field_reservations.event_id
        and public.current_user_can_access_team(event.team_id)
    )
  );

create policy "organization admins manage field reservations" on public.field_reservations
  for all using (public.current_user_is_org_admin(organization_id)) with check (public.current_user_is_org_admin(organization_id));

create policy "team members read chat threads" on public.team_chat_threads
  for select using (public.current_user_can_access_team(team_id));

create policy "team members create chat threads" on public.team_chat_threads
  for insert with check (
    public.current_user_can_access_team(team_id)
    and exists (
      select 1 from public.team_chat_messages message
      where message.id = team_chat_threads.root_message_id
        and message.team_id = team_chat_threads.team_id
    )
  );

create policy "team managers update chat threads" on public.team_chat_threads
  for update using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "users manage own chat reads" on public.team_chat_message_reads
  for all using (
    user_id = auth.uid()
    and exists (
      select 1 from public.team_chat_messages message
      where message.id = team_chat_message_reads.message_id
        and public.current_user_can_access_team(message.team_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.team_chat_messages message
      where message.id = team_chat_message_reads.message_id
        and public.current_user_can_access_team(message.team_id)
    )
  );

create policy "users manage own chat reactions" on public.team_chat_reactions
  for all using (
    user_id = auth.uid()
    and exists (
      select 1 from public.team_chat_messages message
      where message.id = team_chat_reactions.message_id
        and public.current_user_can_access_team(message.team_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.team_chat_messages message
      where message.id = team_chat_reactions.message_id
        and public.current_user_can_access_team(message.team_id)
    )
  );

create policy "team members read chat attachments" on public.team_chat_attachments
  for select using (public.current_user_can_access_team(team_id));

create policy "team members create chat attachments" on public.team_chat_attachments
  for insert with check (
    public.current_user_can_access_team(team_id)
    and uploaded_by_user_id = auth.uid()
    and exists (
      select 1 from public.team_chat_messages message
      where message.id = team_chat_attachments.message_id
        and message.team_id = team_chat_attachments.team_id
    )
  );

create policy "team managers moderate chat attachments" on public.team_chat_attachments
  for update using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team managers read chat reports" on public.team_chat_reports
  for select using (public.current_user_can_manage_team(team_id));

create policy "team members create chat reports" on public.team_chat_reports
  for insert with check (
    public.current_user_can_access_team(team_id)
    and reporter_user_id = auth.uid()
    and exists (
      select 1 from public.team_chat_messages message
      where message.id = team_chat_reports.message_id
        and message.team_id = team_chat_reports.team_id
    )
  );

create policy "team managers review chat reports" on public.team_chat_reports
  for update using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "organization members read active replay templates" on public.parent_replay_templates
  for select using (
    status = 'active'
    and (
      organization_id is null
      or public.current_user_is_org_admin(organization_id)
      or exists (
        select 1 from public.teams team
        where team.organization_id = parent_replay_templates.organization_id
          and public.current_user_can_access_team(team.id)
      )
    )
  );

create policy "organization admins manage replay templates" on public.parent_replay_templates
  for all using (organization_id is not null and public.current_user_is_org_admin(organization_id))
  with check (organization_id is not null and public.current_user_is_org_admin(organization_id));

create policy "team managers read ai generation runs" on public.ai_generation_runs
  for select using (team_id is not null and public.current_user_can_manage_team(team_id));

create policy "team managers create ai generation runs" on public.ai_generation_runs
  for insert with check (team_id is not null and public.current_user_can_manage_team(team_id));

create policy "team members read approved learning plans" on public.learning_plans
  for select using (status = 'approved' and public.current_user_can_access_team(team_id));

create policy "team managers manage learning plans" on public.learning_plans
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "organization members read sponsor packages" on public.sponsor_packages
  for select using (
    public.current_user_is_org_admin(organization_id)
    or exists (
      select 1 from public.teams team
      where team.organization_id = sponsor_packages.organization_id
        and public.current_user_can_access_team(team.id)
    )
  );

create policy "organization admins manage sponsor packages" on public.sponsor_packages
  for all using (public.current_user_is_org_admin(organization_id)) with check (public.current_user_is_org_admin(organization_id));

create policy "organization members read sponsor placements" on public.sponsor_placements
  for select using (
    public.current_user_is_org_admin(organization_id)
    or (team_id is not null and public.current_user_can_access_team(team_id))
  );

create policy "organization admins manage sponsor placements" on public.sponsor_placements
  for all using (public.current_user_is_org_admin(organization_id)) with check (public.current_user_is_org_admin(organization_id));

create policy "organization members read sponsor assets" on public.sponsor_assets
  for select using (
    exists (
      select 1
      from public.sponsors sponsor
      where sponsor.id = sponsor_assets.sponsor_id
        and (
          public.current_user_is_org_admin(sponsor.organization_id)
          or (sponsor.team_id is not null and public.current_user_can_access_team(sponsor.team_id))
        )
    )
  );

create policy "organization admins manage sponsor assets" on public.sponsor_assets
  for all using (
    exists (
      select 1 from public.sponsors sponsor
      where sponsor.id = sponsor_assets.sponsor_id
        and public.current_user_is_org_admin(sponsor.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.sponsors sponsor
      where sponsor.id = sponsor_assets.sponsor_id
        and public.current_user_is_org_admin(sponsor.organization_id)
    )
  );

create policy "team managers read registration approval actions" on public.registration_approval_actions
  for select using (public.current_user_can_manage_team(team_id));

create policy "team managers create registration approval actions" on public.registration_approval_actions
  for insert with check (public.current_user_can_manage_team(team_id));
