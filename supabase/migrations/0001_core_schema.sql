-- Little League HQ core Supabase schema.
-- This is the production persistence contract for the current mobile-first MVP.
-- It preserves these boundaries:
-- - children do not log in;
-- - registration requests do not grant access;
-- - notification and weather records are drafts/queued records until providers send;
-- - Parent Replay records are coach-reviewed guidance, not autonomous AI sends.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  phone text,
  default_role text not null check (default_role in ('admin', 'coach', 'parent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, default_role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    new.email,
    case
      when new.raw_user_meta_data->>'default_role' in ('admin', 'coach', 'parent')
        then new.raw_user_meta_data->>'default_role'
      else 'parent'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'coach')),
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, role)
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null check (status in ('active', 'archived')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  division text not null,
  name text not null,
  coach_user_id uuid references public.profiles(id) on delete set null,
  mascot text not null default 'Team',
  primary_color text not null default '#1d4ed8' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#f97316' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  theme_key text not null default 'baseball' check (theme_key in ('soccer', 'football', 'baseball', 'scouts', 'golf', 'tennis', 'swim', 'generic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('coach', 'parent')),
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id, role)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  first_name text not null,
  last_initial text not null check (char_length(last_initial) between 1 and 2),
  jersey text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parent_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  email text not null,
  phone text,
  invite_token_hash text not null,
  status text not null check (status in ('pending', 'accepted', 'expired', 'revoked')),
  delivery_status text not null default 'queued' check (delivery_status in ('queued', 'sent', 'failed')),
  sent_count integer not null default 0 check (sent_count >= 0),
  resend_timestamps timestamptz[] not null default '{}',
  last_sent_at timestamptz,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_guardians (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  parent_user_id uuid references public.profiles(id) on delete set null,
  parent_invite_id uuid references public.parent_invites(id) on delete set null,
  relationship text not null check (relationship in ('mother', 'father', 'guardian', 'other')),
  status text not null check (status in ('invited', 'active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_user_id is not null or parent_invite_id is not null)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  title text not null,
  event_type text not null check (event_type in ('game', 'practice', 'team_event')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location_name text,
  location_address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  opponent text,
  status text not null check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  parent_user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (response in ('going', 'not_going', 'maybe')),
  note text,
  responded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  media_type text not null check (media_type in ('google_photos', 'youtube')),
  url text not null,
  created_at timestamptz not null default now()
);

create table public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  parent_name text not null,
  parent_email text not null,
  player_first_name text not null,
  player_last_initial text not null check (char_length(player_last_initial) between 1 and 2),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.snack_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  assigned_parent_user_id uuid references public.profiles(id) on delete set null,
  item text not null,
  status text not null default 'open' check (status in ('open', 'assigned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  role text not null,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'filled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  level text not null check (level in ('league', 'team')),
  team_id uuid references public.teams(id) on delete cascade,
  url text not null,
  status text not null check (status in ('active', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((level = 'team' and team_id is not null) or (level = 'league' and team_id is null))
);

create table public.weather_alerts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  headline text not null,
  detail text not null,
  severity text not null check (severity in ('watch', 'delay', 'cancel_risk')),
  status text not null default 'draft' check (status in ('draft', 'queued')),
  provider text,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parent_replays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  coach_user_id uuid not null references public.profiles(id) on delete restrict,
  focus_areas text[] not null,
  title text not null,
  summary text not null,
  home_activities jsonb not null,
  coach_video jsonb not null,
  parent_tip text not null,
  team_quest text not null,
  skill_cards text[] not null default '{}',
  parent_education text not null,
  status text not null default 'draft' check (status in ('draft', 'queued')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.team_chat_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  pinned_message_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id)
);

create table public.team_chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  channel_id uuid not null references public.team_chat_channels(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  author_role text not null check (author_role in ('admin', 'coach', 'parent')),
  message_kind text not null check (message_kind in ('message', 'announcement')),
  announcement_topic text check (announcement_topic in ('game_time', 'field_location', 'uniforms', 'snacks', 'weather', 'reminder')),
  body text not null,
  pinned boolean not null default false,
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'hidden', 'deleted')),
  read_by_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  moderated_at timestamptz,
  moderated_by_user_id uuid references public.profiles(id) on delete set null,
  moderation_reason text
);

alter table public.team_chat_channels
  add constraint team_chat_channels_pinned_message_id_fkey
  foreign key (pinned_message_id) references public.team_chat_messages(id) on delete set null;

create table public.chat_moderation_audit_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.team_chat_messages(id) on delete cascade,
  channel_id uuid not null references public.team_chat_channels(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  actor_role text not null check (actor_role in ('admin', 'coach', 'parent')),
  action text not null check (action in ('message_hidden', 'message_deleted', 'message_restored')),
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  notification_type text not null check (notification_type in ('schedule_changed', 'event_cancelled', 'new_event', 'invite_sent', 'invite_recovered', 'parent_replay_ready')),
  title text not null,
  body text not null,
  channel text not null check (channel in ('push', 'email', 'sms')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'read')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table public.roster_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  uploaded_by_user_id uuid not null references public.profiles(id) on delete restrict,
  filename text,
  status text not null check (status in ('uploaded', 'validated', 'committed', 'failed')),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  warning_rows integer not null default 0,
  error_rows integer not null default 0,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

create table public.roster_import_rows (
  id uuid primary key default gen_random_uuid(),
  roster_import_id uuid not null references public.roster_imports(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null,
  normalized_data jsonb not null,
  status text not null check (status in ('valid', 'warning', 'error', 'skipped')),
  issue_codes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create index idx_organization_memberships_user_id on public.organization_memberships(user_id);
create index idx_team_memberships_user_id on public.team_memberships(user_id);
create index idx_team_memberships_team_id on public.team_memberships(team_id);
create index idx_players_team_id on public.players(team_id);
create index idx_events_team_starts_at on public.events(team_id, starts_at);
create index idx_rsvps_parent_user_id on public.rsvps(parent_user_id);
create index idx_registration_requests_team_status on public.registration_requests(team_id, status);
create index idx_team_chat_messages_channel_created_at on public.team_chat_messages(channel_id, created_at);
create index idx_team_chat_messages_event_id on public.team_chat_messages(event_id);
create index idx_notifications_recipient_status on public.notifications(recipient_user_id, status);
create index idx_audit_events_target on public.audit_events(target_type, target_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_organizations_updated_at before update on public.organizations for each row execute function public.touch_updated_at();
create trigger touch_organization_memberships_updated_at before update on public.organization_memberships for each row execute function public.touch_updated_at();
create trigger touch_seasons_updated_at before update on public.seasons for each row execute function public.touch_updated_at();
create trigger touch_teams_updated_at before update on public.teams for each row execute function public.touch_updated_at();
create trigger touch_team_memberships_updated_at before update on public.team_memberships for each row execute function public.touch_updated_at();
create trigger touch_players_updated_at before update on public.players for each row execute function public.touch_updated_at();
create trigger touch_player_guardians_updated_at before update on public.player_guardians for each row execute function public.touch_updated_at();
create trigger touch_parent_invites_updated_at before update on public.parent_invites for each row execute function public.touch_updated_at();
create trigger touch_events_updated_at before update on public.events for each row execute function public.touch_updated_at();
create trigger touch_rsvps_updated_at before update on public.rsvps for each row execute function public.touch_updated_at();
create trigger touch_snack_schedule_slots_updated_at before update on public.snack_schedule_slots for each row execute function public.touch_updated_at();
create trigger touch_volunteer_signups_updated_at before update on public.volunteer_signups for each row execute function public.touch_updated_at();
create trigger touch_sponsors_updated_at before update on public.sponsors for each row execute function public.touch_updated_at();
create trigger touch_weather_alerts_updated_at before update on public.weather_alerts for each row execute function public.touch_updated_at();
create trigger touch_team_chat_channels_updated_at before update on public.team_chat_channels for each row execute function public.touch_updated_at();
create trigger touch_push_subscriptions_updated_at before update on public.push_subscriptions for each row execute function public.touch_updated_at();

create or replace function public.current_user_is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
      and membership.status = 'active'
  );
$$;

create or replace function public.current_user_can_access_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_memberships membership
    where membership.team_id = target_team_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
  or exists (
    select 1
    from public.teams team
    join public.organization_memberships membership
      on membership.organization_id = team.organization_id
    where team.id = target_team_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
      and membership.status = 'active'
  );
$$;

create or replace function public.current_user_can_manage_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_memberships membership
    where membership.team_id = target_team_id
      and membership.user_id = auth.uid()
      and membership.role = 'coach'
      and membership.status = 'active'
  )
  or exists (
    select 1
    from public.teams team
    join public.organization_memberships membership
      on membership.organization_id = team.organization_id
    where team.id = target_team_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
      and membership.status = 'active'
  );
$$;

create or replace function public.current_user_can_read_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
  or exists (
    select 1
    from public.team_memberships viewer
    join public.team_memberships target
      on target.team_id = viewer.team_id
    where viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and target.user_id = target_user_id
      and target.status = 'active'
  )
  or exists (
    select 1
    from public.organization_memberships viewer
    join public.organization_memberships target
      on target.organization_id = viewer.organization_id
    where viewer.user_id = auth.uid()
      and viewer.role = 'admin'
      and viewer.status = 'active'
      and target.user_id = target_user_id
      and target.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.players enable row level security;
alter table public.parent_invites enable row level security;
alter table public.player_guardians enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.announcements enable row level security;
alter table public.media_items enable row level security;
alter table public.registration_requests enable row level security;
alter table public.snack_schedule_slots enable row level security;
alter table public.volunteer_signups enable row level security;
alter table public.sponsors enable row level security;
alter table public.weather_alerts enable row level security;
alter table public.parent_replays enable row level security;
alter table public.team_chat_channels enable row level security;
alter table public.team_chat_messages enable row level security;
alter table public.chat_moderation_audit_events enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.roster_imports enable row level security;
alter table public.roster_import_rows enable row level security;
alter table public.audit_events enable row level security;

create policy "team and org members can read relevant profiles" on public.profiles
  for select using (public.current_user_can_read_profile(id));

create policy "profiles can insert own profile" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles can update own basic profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organization members can read organizations" on public.organizations
  for select using (
    exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = organizations.id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

create policy "organization admins can manage organizations" on public.organizations
  for update using (public.current_user_is_org_admin(id)) with check (public.current_user_is_org_admin(id));

create policy "members can read their org memberships" on public.organization_memberships
  for select using (
    user_id = auth.uid()
    or public.current_user_is_org_admin(organization_id)
  );

create policy "organization admins manage memberships" on public.organization_memberships
  for all using (public.current_user_is_org_admin(organization_id)) with check (public.current_user_is_org_admin(organization_id));

create policy "members can read seasons" on public.seasons
  for select using (
    exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = seasons.organization_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

create policy "organization admins manage seasons" on public.seasons
  for all using (public.current_user_is_org_admin(organization_id)) with check (public.current_user_is_org_admin(organization_id));

create policy "members can read teams" on public.teams
  for select using (
    public.current_user_can_access_team(id)
    or public.current_user_is_org_admin(organization_id)
  );

create policy "coaches and admins update team branding" on public.teams
  for update using (public.current_user_can_manage_team(id)) with check (public.current_user_can_manage_team(id));

create policy "organization admins create teams" on public.teams
  for insert with check (public.current_user_is_org_admin(organization_id));

create policy "members can read team memberships" on public.team_memberships
  for select using (
    user_id = auth.uid()
    or public.current_user_can_manage_team(team_id)
  );

create policy "coaches and admins manage team memberships" on public.team_memberships
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team members can read players" on public.players
  for select using (public.current_user_can_access_team(team_id));

create policy "coaches and admins manage players" on public.players
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team managers can read and manage invites" on public.parent_invites
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team members can read guardian links" on public.player_guardians
  for select using (
    exists (
      select 1 from public.players player
      where player.id = player_guardians.player_id
        and public.current_user_can_access_team(player.team_id)
    )
  );

create policy "coaches and admins manage guardian links" on public.player_guardians
  for all using (
    exists (
      select 1 from public.players player
      where player.id = player_guardians.player_id
        and public.current_user_can_manage_team(player.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.players player
      where player.id = player_guardians.player_id
        and public.current_user_can_manage_team(player.team_id)
    )
  );

create policy "team members can read events" on public.events
  for select using (public.current_user_can_access_team(team_id));

create policy "coaches and admins manage events" on public.events
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team members can read rsvps" on public.rsvps
  for select using (
    exists (
      select 1 from public.events event
      where event.id = rsvps.event_id
        and public.current_user_can_access_team(event.team_id)
    )
  );

create policy "parents can upsert own rsvps" on public.rsvps
  for all using (parent_user_id = auth.uid()) with check (parent_user_id = auth.uid());

create policy "team members can read announcements" on public.announcements
  for select using (public.current_user_can_access_team(team_id));

create policy "coaches and admins manage announcements" on public.announcements
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team members can read media" on public.media_items
  for select using (public.current_user_can_access_team(team_id));

create policy "coaches and admins manage media" on public.media_items
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "anyone can create pending registration requests" on public.registration_requests
  for insert with check (status = 'pending');

create policy "team managers can read registration requests" on public.registration_requests
  for select using (public.current_user_can_manage_team(team_id));

create policy "team managers can review registration requests" on public.registration_requests
  for update using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team members can read snacks" on public.snack_schedule_slots
  for select using (public.current_user_can_access_team(team_id));

create policy "team members can update snacks" on public.snack_schedule_slots
  for update using (public.current_user_can_access_team(team_id)) with check (public.current_user_can_access_team(team_id));

create policy "coaches and admins create snacks" on public.snack_schedule_slots
  for insert with check (public.current_user_can_manage_team(team_id));

create policy "team members can read volunteers" on public.volunteer_signups
  for select using (public.current_user_can_access_team(team_id));

create policy "team members can update volunteers" on public.volunteer_signups
  for update using (public.current_user_can_access_team(team_id)) with check (public.current_user_can_access_team(team_id));

create policy "coaches and admins create volunteers" on public.volunteer_signups
  for insert with check (public.current_user_can_manage_team(team_id));

create policy "organization members can read sponsors" on public.sponsors
  for select using (
    public.current_user_is_org_admin(organization_id)
    or team_id is not null and public.current_user_can_access_team(team_id)
  );

create policy "organization admins manage sponsors" on public.sponsors
  for all using (public.current_user_is_org_admin(organization_id)) with check (public.current_user_is_org_admin(organization_id));

create policy "team members can read weather alerts" on public.weather_alerts
  for select using (public.current_user_can_access_team(team_id));

create policy "coaches and admins manage weather alerts" on public.weather_alerts
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team members can read parent replay" on public.parent_replays
  for select using (public.current_user_can_access_team(team_id));

create policy "coaches and admins manage parent replay" on public.parent_replays
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team members can read chat channels" on public.team_chat_channels
  for select using (public.current_user_can_access_team(team_id));

create policy "coaches and admins manage chat channels" on public.team_chat_channels
  for all using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team members can read chat messages" on public.team_chat_messages
  for select using (public.current_user_can_access_team(team_id));

create policy "team members can create chat messages" on public.team_chat_messages
  for insert with check (
    public.current_user_can_access_team(team_id)
    and author_user_id = auth.uid()
    and moderation_status = 'visible'
  );

create policy "authors can edit own visible chat messages" on public.team_chat_messages
  for update using (
    author_user_id = auth.uid()
    and moderation_status = 'visible'
  )
  with check (
    author_user_id = auth.uid()
    and public.current_user_can_access_team(team_id)
  );

create policy "coaches and admins can moderate chat messages" on public.team_chat_messages
  for update using (public.current_user_can_manage_team(team_id)) with check (public.current_user_can_manage_team(team_id));

create policy "team managers can read moderation audit" on public.chat_moderation_audit_events
  for select using (public.current_user_can_manage_team(team_id));

create policy "team managers can create moderation audit" on public.chat_moderation_audit_events
  for insert with check (public.current_user_can_manage_team(team_id));

create policy "users can read own notifications" on public.notifications
  for select using (
    recipient_user_id = auth.uid()
    or public.current_user_can_manage_team(team_id)
  );

create policy "team managers can create notifications" on public.notifications
  for insert with check (public.current_user_can_manage_team(team_id));

create policy "users can mark own notifications read" on public.notifications
  for update using (recipient_user_id = auth.uid()) with check (recipient_user_id = auth.uid());

create policy "users manage own push subscriptions" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "organization admins manage roster imports" on public.roster_imports
  for all using (public.current_user_is_org_admin(organization_id)) with check (public.current_user_is_org_admin(organization_id));

create policy "organization admins read roster import rows" on public.roster_import_rows
  for select using (
    exists (
      select 1 from public.roster_imports roster_import
      where roster_import.id = roster_import_rows.roster_import_id
        and public.current_user_is_org_admin(roster_import.organization_id)
    )
  );

create policy "organization admins create roster import rows" on public.roster_import_rows
  for insert with check (
    exists (
      select 1 from public.roster_imports roster_import
      where roster_import.id = roster_import_rows.roster_import_id
        and public.current_user_is_org_admin(roster_import.organization_id)
    )
  );

create policy "organization admins read audit events" on public.audit_events
  for select using (
    organization_id is not null
    and public.current_user_is_org_admin(organization_id)
  );

create policy "organization admins create audit events" on public.audit_events
  for insert with check (
    organization_id is not null
    and public.current_user_is_org_admin(organization_id)
  );
