create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin', 'coach', 'parent')),
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('admin', 'coach')),
  status text not null check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, role)
);

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  status text not null check (status in ('active', 'archived')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  division text not null,
  name text not null,
  coach_user_id uuid references users(id) on delete set null,
  mascot text not null,
  primary_color text not null check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  theme_key text not null check (theme_key in ('soccer', 'football', 'baseball', 'scouts', 'golf', 'tennis', 'swim', 'generic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (season_id, organization_id) references seasons(id, organization_id) on delete cascade,
  unique (id, organization_id),
  unique (id, season_id),
  unique (id, organization_id, season_id)
);

create table if not exists team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('coach', 'parent')),
  status text not null check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id, role)
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  first_name text not null,
  last_initial text not null check (char_length(last_initial) >= 1),
  jersey text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, organization_id, season_id) references teams(id, organization_id, season_id) on delete cascade,
  unique (id, team_id),
  unique (id, organization_id, season_id, team_id)
);

create table if not exists parent_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  email text not null,
  phone text not null,
  invite_token_hash text not null,
  status text not null check (status in ('pending', 'accepted', 'expired', 'revoked')),
  delivery_status text not null check (delivery_status in ('queued', 'sent', 'failed')),
  sent_count integer not null default 0 check (sent_count >= 0),
  resend_timestamps timestamptz[] not null default '{}',
  last_sent_at timestamptz,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, organization_id) references teams(id, organization_id) on delete cascade,
  foreign key (player_id, team_id) references players(id, team_id) on delete cascade
);

create table if not exists player_guardians (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  parent_user_id uuid references users(id) on delete set null,
  parent_invite_id uuid references parent_invites(id) on delete set null,
  relationship text not null check (relationship in ('mother', 'father', 'guardian', 'other')),
  status text not null check (status in ('invited', 'active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_user_id is not null or parent_invite_id is not null)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  title text not null,
  event_type text not null check (event_type in ('game', 'practice', 'team_event')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location_name text not null,
  location_address text not null,
  status text not null check (status in ('scheduled', 'cancelled', 'completed')),
  opponent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (team_id, organization_id, season_id) references teams(id, organization_id, season_id) on delete cascade,
  unique (id, team_id),
  unique (id, organization_id, season_id, team_id)
);

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  parent_user_id uuid not null references users(id) on delete cascade,
  response text not null check (response in ('going', 'not_going', 'maybe', 'cancelled')),
  note text,
  responded_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, team_id) references events(id, team_id) on delete cascade,
  foreign key (player_id, team_id) references players(id, team_id) on delete cascade,
  unique (event_id, player_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  recipient_user_id uuid not null references users(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  notification_type text not null check (
    notification_type in (
      'schedule_changed',
      'event_cancelled',
      'new_event',
      'invite_sent',
      'invite_recovered',
      'parent_replay_ready',
      'team_broadcast'
    )
  ),
  title text not null,
  body text not null,
  channel text not null check (channel in ('push', 'email', 'sms')),
  status text not null check (status in ('pending', 'sent', 'failed', 'read')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  foreign key (team_id, organization_id) references teams(id, organization_id) on delete cascade,
  foreign key (event_id, team_id) references events(id, team_id)
);

create table if not exists weather_alerts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  headline text not null,
  detail text not null,
  severity text not null check (severity in ('watch', 'delay', 'cancel_risk')),
  status text not null check (status in ('draft', 'queued')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, team_id) references events(id, team_id) on delete cascade
);

create table if not exists team_chat_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  pinned_message_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, organization_id, season_id) references teams(id, organization_id, season_id) on delete cascade,
  unique (team_id),
  unique (id, team_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references team_chat_channels(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  author_user_id uuid not null references users(id) on delete restrict,
  author_role text not null check (author_role in ('admin', 'coach', 'parent')),
  kind text not null check (kind in ('message', 'announcement')),
  topic text check (topic in ('game_time', 'field_location', 'uniforms', 'snacks', 'weather', 'reminder')),
  body text not null,
  event_id uuid references events(id) on delete set null,
  pinned boolean not null default false,
  moderation_status text not null check (moderation_status in ('visible', 'hidden', 'deleted')),
  read_by_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  moderated_at timestamptz,
  moderated_by_user_id uuid references users(id) on delete set null,
  moderation_reason text,
  foreign key (channel_id, team_id) references team_chat_channels(id, team_id) on delete cascade,
  foreign key (team_id, organization_id, season_id) references teams(id, organization_id, season_id) on delete cascade,
  foreign key (event_id, team_id) references events(id, team_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_chat_channels_pinned_message_id_fkey'
  ) then
    alter table team_chat_channels
      add constraint team_chat_channels_pinned_message_id_fkey
      foreign key (pinned_message_id) references messages(id) on delete set null;
  end if;
end $$;

create index if not exists idx_teams_organization_id on teams(organization_id);
create index if not exists idx_teams_season_id on teams(season_id);
create index if not exists idx_organization_memberships_user_id on organization_memberships(user_id);
create index if not exists idx_team_memberships_team_id on team_memberships(team_id);
create index if not exists idx_team_memberships_user_id on team_memberships(user_id);
create index if not exists idx_players_team_id on players(team_id);
create index if not exists idx_parent_invites_email on parent_invites(email);
create index if not exists idx_player_guardians_parent_user_id on player_guardians(parent_user_id);
create index if not exists idx_player_guardians_player_id on player_guardians(player_id);
create index if not exists idx_events_team_starts_at on events(team_id, starts_at);
create index if not exists idx_rsvps_team_event on rsvps(team_id, event_id);
create index if not exists idx_rsvps_parent_user_id on rsvps(parent_user_id);
create index if not exists idx_notifications_team_status on notifications(team_id, status);
create index if not exists idx_notifications_recipient_status on notifications(recipient_user_id, status);
create index if not exists idx_weather_alerts_team_status on weather_alerts(team_id, status);
create index if not exists idx_messages_team_created_at on messages(team_id, created_at);
create index if not exists idx_messages_channel_created_at on messages(channel_id, created_at);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_organizations_updated_at on organizations;
create trigger touch_organizations_updated_at
  before update on organizations
  for each row execute function touch_updated_at();

drop trigger if exists touch_users_updated_at on users;
create trigger touch_users_updated_at
  before update on users
  for each row execute function touch_updated_at();

drop trigger if exists touch_organization_memberships_updated_at on organization_memberships;
create trigger touch_organization_memberships_updated_at
  before update on organization_memberships
  for each row execute function touch_updated_at();

drop trigger if exists touch_seasons_updated_at on seasons;
create trigger touch_seasons_updated_at
  before update on seasons
  for each row execute function touch_updated_at();

drop trigger if exists touch_teams_updated_at on teams;
create trigger touch_teams_updated_at
  before update on teams
  for each row execute function touch_updated_at();

drop trigger if exists touch_team_memberships_updated_at on team_memberships;
create trigger touch_team_memberships_updated_at
  before update on team_memberships
  for each row execute function touch_updated_at();

drop trigger if exists touch_players_updated_at on players;
create trigger touch_players_updated_at
  before update on players
  for each row execute function touch_updated_at();

drop trigger if exists touch_parent_invites_updated_at on parent_invites;
create trigger touch_parent_invites_updated_at
  before update on parent_invites
  for each row execute function touch_updated_at();

drop trigger if exists touch_player_guardians_updated_at on player_guardians;
create trigger touch_player_guardians_updated_at
  before update on player_guardians
  for each row execute function touch_updated_at();

drop trigger if exists touch_events_updated_at on events;
create trigger touch_events_updated_at
  before update on events
  for each row execute function touch_updated_at();

drop trigger if exists touch_rsvps_updated_at on rsvps;
create trigger touch_rsvps_updated_at
  before update on rsvps
  for each row execute function touch_updated_at();

drop trigger if exists touch_notifications_updated_at on notifications;
create trigger touch_notifications_updated_at
  before update on notifications
  for each row execute function touch_updated_at();

drop trigger if exists touch_weather_alerts_updated_at on weather_alerts;
create trigger touch_weather_alerts_updated_at
  before update on weather_alerts
  for each row execute function touch_updated_at();

drop trigger if exists touch_team_chat_channels_updated_at on team_chat_channels;
create trigger touch_team_chat_channels_updated_at
  before update on team_chat_channels
  for each row execute function touch_updated_at();

drop trigger if exists touch_messages_updated_at on messages;
create trigger touch_messages_updated_at
  before update on messages
  for each row execute function touch_updated_at();
